import "server-only";
import { sendNotification, setVapidDetails } from "web-push";
import { db } from "@/lib/db";
import {
	getLocalTimeParts,
	PushSubscriptionPayloadSchema,
	ReminderSettingsSchema,
	shouldSendPeriodReminder,
	shouldSendTrainingReminder,
} from "@/lib/push/reminder-logic";
import { computeNextPeriodPrediction } from "@/lib/wellness/cycle-and-wellness";

type NotificationPayload = {
	title: string;
	body: string;
	url: string;
};

export function getPublicVapidKey(): string | null {
	const value = (
		process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ??
		process.env.VAPID_PUBLIC_KEY ??
		""
	).trim();
	return value.length > 0 ? value : null;
}

function getVapidConfig() {
	const publicKey = getPublicVapidKey();
	const privateKey = (process.env.VAPID_PRIVATE_KEY ?? "").trim();
	if (!publicKey || !privateKey) return null;

	const rawSubject = (process.env.VAPID_SUBJECT ?? "").trim();
	const subject = rawSubject || "mailto:admin@calisthenicsquest.local";
	return { publicKey, privateKey, subject };
}

export function isWebPushConfigured(): boolean {
	return getVapidConfig() !== null;
}

function ensureWebPushConfigured(): boolean {
	const config = getVapidConfig();
	if (!config) return false;
	setVapidDetails(config.subject, config.publicKey, config.privateKey);
	return true;
}

export async function upsertPushSubscriptionForUser(
	userId: string,
	rawPayload: unknown,
) {
	const parsed = PushSubscriptionPayloadSchema.safeParse(rawPayload);
	if (!parsed.success) {
		return { ok: false as const, reason: "invalid_input" as const };
	}

	const { endpoint, keys } = parsed.data;
	await db.pushSubscription.upsert({
		where: { endpoint },
		create: {
			userId,
			endpoint,
			p256dh: keys.p256dh,
			auth: keys.auth,
		},
		update: {
			userId,
			p256dh: keys.p256dh,
			auth: keys.auth,
		},
	});

	return { ok: true as const };
}

export async function deletePushSubscriptionForUser(
	userId: string,
	endpoint: string,
) {
	if (!endpoint.trim()) {
		return { ok: false as const, reason: "invalid_input" as const };
	}

	await db.pushSubscription.deleteMany({
		where: { userId, endpoint },
	});
	return { ok: true as const };
}

export async function updateReminderSettingsForUser(
	userId: string,
	rawSettings: unknown,
) {
	const parsed = ReminderSettingsSchema.safeParse(rawSettings);
	if (!parsed.success) {
		return { ok: false as const, reason: "invalid_input" as const };
	}

	await db.profile.update({
		where: { userId },
		data: {
			reminderEnabled: parsed.data.reminderEnabled,
			reminderTime: parsed.data.reminderTime,
		},
	});

	return {
		ok: true as const,
		reminderEnabled: parsed.data.reminderEnabled,
		reminderTime: parsed.data.reminderTime,
	};
}

export async function getReminderStateForUser(userId: string) {
	const [profile, subscriptionCount] = await Promise.all([
		db.profile.findUnique({
			where: { userId },
			select: {
				reminderEnabled: true,
				reminderTime: true,
				trainingDays: true,
				timezone: true,
			},
		}),
		db.pushSubscription.count({ where: { userId } }),
	]);

	return {
		configured: isWebPushConfigured(),
		publicVapidKey: getPublicVapidKey(),
		reminderEnabled: profile?.reminderEnabled ?? false,
		reminderTime: profile?.reminderTime ?? "18:00",
		trainingDaysCount: profile?.trainingDays.length ?? 0,
		timezone: profile?.timezone ?? "Asia/Jakarta",
		subscriptionCount,
	};
}

async function sendPushPayloadToSubscriptions(
	subscriptions: readonly {
		id: string;
		endpoint: string;
		p256dh: string;
		auth: string;
	}[],
	payload: NotificationPayload,
) {
	let sentCount = 0;
	let staleRemovedCount = 0;
	const serialized = JSON.stringify(payload);

	for (const sub of subscriptions) {
		try {
			await sendNotification(
				{
					endpoint: sub.endpoint,
					keys: { p256dh: sub.p256dh, auth: sub.auth },
				},
				serialized,
			);
			sentCount += 1;
		} catch (error) {
			const statusCode =
				typeof error === "object" && error !== null && "statusCode" in error
					? Number((error as { statusCode?: unknown }).statusCode)
					: undefined;
			if (statusCode === 404 || statusCode === 410) {
				await db.pushSubscription.deleteMany({ where: { id: sub.id } });
				staleRemovedCount += 1;
			}
		}
	}

	return { sentCount, staleRemovedCount };
}

export async function sendTestPushToUser(userId: string) {
	if (!ensureWebPushConfigured()) {
		return { ok: false as const, reason: "not_configured" as const };
	}

	const subscriptions = await db.pushSubscription.findMany({
		where: { userId },
		select: { id: true, endpoint: true, p256dh: true, auth: true },
	});

	if (subscriptions.length === 0) {
		return { ok: false as const, reason: "no_subscription" as const };
	}

	const { sentCount } = await sendPushPayloadToSubscriptions(subscriptions, {
		title: "Calisthenics Quest",
		body: "Workout reminders are active! Ready for your next quest?",
		url: "/today",
	});

	if (sentCount === 0) {
		return { ok: false as const, reason: "send_failed" as const };
	}

	return { ok: true as const, sentCount };
}

export async function dispatchDueTrainingReminders(now = new Date()) {
	if (!ensureWebPushConfigured()) {
		return {
			ok: false as const,
			reason: "not_configured" as const,
			checked: 0,
			sentUsers: 0,
			sentNotifications: 0,
			staleRemoved: 0,
		};
	}

	const profiles = await db.profile.findMany({
		where: {
			reminderEnabled: true,
			onboardingCompletedAt: { not: null },
			user: { pushSubscriptions: { some: {} } },
		},
		select: {
			userId: true,
			timezone: true,
			trainingDays: true,
			reminderEnabled: true,
			reminderTime: true,
			lastReminderDate: true,
			user: {
				select: {
					pushSubscriptions: {
						select: { id: true, endpoint: true, p256dh: true, auth: true },
					},
				},
			},
		},
	});

	let sentUsers = 0;
	let sentNotifications = 0;
	let staleRemoved = 0;

	for (const profile of profiles) {
		const local = getLocalTimeParts(profile.timezone, now);
		if (
			!profile.trainingDays.includes(local.dayOfWeek) ||
			profile.lastReminderDate === local.dateKey
		) {
			continue;
		}

		const workoutLog = await db.workoutLog.findUnique({
			where: {
				userId_date: {
					userId: profile.userId,
					date: local.dateKey,
				},
			},
			select: { completedAt: true },
		});

		const shouldSend = shouldSendTrainingReminder({
			reminderEnabled: profile.reminderEnabled,
			reminderTime: profile.reminderTime,
			trainingDays: profile.trainingDays,
			lastReminderDate: profile.lastReminderDate,
			hasCompletedSessionToday: Boolean(workoutLog?.completedAt),
			localDateKey: local.dateKey,
			localDayOfWeek: local.dayOfWeek,
			localMinutesOfDay: local.minutesOfDay,
		});

		if (!shouldSend) continue;

		const result = await sendPushPayloadToSubscriptions(
			profile.user.pushSubscriptions,
			{
				title: "Time to train!",
				body: "Today's calisthenics quest is waiting. Keep your streak alive!",
				url: "/today?tab=log",
			},
		);

		staleRemoved += result.staleRemovedCount;
		if (result.sentCount > 0) {
			sentUsers += 1;
			sentNotifications += result.sentCount;
			await db.profile.update({
				where: { userId: profile.userId },
				data: { lastReminderDate: local.dateKey },
			});
		}
	}

	return {
		ok: true as const,
		checked: profiles.length,
		sentUsers,
		sentNotifications,
		staleRemoved,
	};
}

export async function dispatchDuePeriodReminders(now = new Date()) {
	if (!ensureWebPushConfigured()) {
		return {
			ok: false as const,
			reason: "not_configured" as const,
			checked: 0,
			sentUsers: 0,
			sentNotifications: 0,
			staleRemoved: 0,
		};
	}

	const profiles = await db.profile.findMany({
		where: {
			tracksPeriod: true,
			periodReminderEnabled: true,
			onboardingCompletedAt: { not: null },
			user: { pushSubscriptions: { some: {} } },
		},
		select: {
			userId: true,
			timezone: true,
			tracksPeriod: true,
			periodReminderEnabled: true,
			lastPeriodStartDate: true,
			averageCycleDays: true,
			averagePeriodDays: true,
			cycleRegularity: true,
			reminderTime: true,
			lastPeriodReminderDate: true,
			user: {
				select: {
					pushSubscriptions: {
						select: { id: true, endpoint: true, p256dh: true, auth: true },
					},
					menstrualCycles: {
						orderBy: { startDate: "desc" },
						take: 6,
						select: {
							startDate: true,
							endDate: true,
							cycleLengthDays: true,
							periodLengthDays: true,
							isConfirmed: true,
						},
					},
				},
			},
		},
	});

	let sentUsers = 0;
	let sentNotifications = 0;
	let staleRemoved = 0;

	for (const profile of profiles) {
		const local = getLocalTimeParts(profile.timezone, now);
		if (profile.lastPeriodReminderDate === local.dateKey) {
			continue;
		}

		const prediction = computeNextPeriodPrediction({
			tracksPeriod: profile.tracksPeriod,
			lastPeriodStartDate: profile.lastPeriodStartDate,
			averageCycleDays: profile.averageCycleDays,
			averagePeriodDays: profile.averagePeriodDays,
			cycleRegularity: profile.cycleRegularity,
			cycles: profile.user.menstrualCycles,
			todayDateKey: local.dateKey,
		});

		const shouldSend = shouldSendPeriodReminder({
			tracksPeriod: profile.tracksPeriod,
			periodReminderEnabled: profile.periodReminderEnabled,
			daysUntilNextPeriod: prediction?.daysUntilNextPeriod ?? null,
			lastPeriodReminderDate: profile.lastPeriodReminderDate,
			reminderTime: profile.reminderTime || "09:00",
			localDateKey: local.dateKey,
			localMinutesOfDay: local.minutesOfDay,
		});

		if (!shouldSend) continue;

		const result = await sendPushPayloadToSubscriptions(
			profile.user.pushSubscriptions,
			{
				title: "Cycle heads-up",
				body: "Your next cycle window is predicted in 2 days. Log wellness or plan recovery.",
				url: "/calendar",
			},
		);

		staleRemoved += result.staleRemovedCount;
		if (result.sentCount > 0) {
			sentUsers += 1;
			sentNotifications += result.sentCount;
			await db.profile.update({
				where: { userId: profile.userId },
				data: { lastPeriodReminderDate: local.dateKey },
			});
		}
	}

	return {
		ok: true as const,
		checked: profiles.length,
		sentUsers,
		sentNotifications,
		staleRemoved,
	};
}
