import "server-only";
import { db } from "@/lib/db";
import {
	buildDailyQuestTemplates,
	evaluateStreakHistory,
	getLevelProgress,
} from "@/lib/gamification/engine";
import { assertCanGeneratePlan } from "@/server/services/plan-gate";
import {
	getCurrentWeeklyPlan,
	getLocalDateKey,
} from "@/server/services/weekly-plan-service";

export async function recalculateAndSaveUserStats(userId: string) {
	const [profile, xpSum, completedLogs] = await Promise.all([
		db.profile.findUnique({
			where: { userId },
			select: { trainingDays: true, timezone: true, createdAt: true },
		}),
		db.xpEvent.aggregate({
			where: { userId },
			_sum: { amount: true },
		}),
		db.workoutLog.findMany({
			where: { userId, completedAt: { not: null } },
			select: { date: true },
			orderBy: { date: "asc" },
		}),
	]);

	const timezone = profile?.timezone ?? "Asia/Jakarta";
	const todayKey = getLocalDateKey(timezone);
	const startDateKey = profile
		? getLocalDateKey(timezone, profile.createdAt)
		: todayKey;

	const totalXp = xpSum._sum.amount ?? 0;
	const levelProgress = getLevelProgress(totalXp);
	const streak = evaluateStreakHistory({
		scheduledDays: profile?.trainingDays ?? [],
		completedDates: completedLogs.map((l) => l.date),
		startDateKey,
		todayDateKey: todayKey,
	});

	const stats = await db.userStats.upsert({
		where: { userId },
		create: {
			userId,
			totalXp,
			level: levelProgress.level,
			currentStreak: streak.currentStreak,
			longestStreak: streak.longestStreak,
			freezesAvailable: streak.freezesAvailable,
			freezeWeekKey: streak.freezeWeekKey,
			lastActiveDate: streak.lastActiveDate,
		},
		update: {
			totalXp,
			level: levelProgress.level,
			currentStreak: streak.currentStreak,
			longestStreak: streak.longestStreak,
			freezesAvailable: streak.freezesAvailable,
			freezeWeekKey: streak.freezeWeekKey,
			lastActiveDate: streak.lastActiveDate,
		},
	});

	return {
		...stats,
		levelProgress,
	};
}

export async function ensureTodayQuestsAndStats(userId: string) {
	const profile = await db.profile.findUnique({ where: { userId } });
	assertCanGeneratePlan(profile);
	if (!profile) throw new Error("Profile missing");

	const todayKey = getLocalDateKey(profile.timezone);
	const todayDayOfWeek = new Date(`${todayKey}T00:00:00.000Z`).getUTCDay();

	const [plan, todayLog] = await Promise.all([
		getCurrentWeeklyPlan(userId, profile.timezone),
		db.workoutLog.findUnique({
			where: { userId_date: { userId, date: todayKey } },
			include: {
				sets: {
					orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
				},
			},
		}),
	]);

	const todaySession =
		plan?.sessions.find((s) => s.dayOfWeek === todayDayOfWeek) ?? null;
	const isRestDay = todaySession ? todaySession.isRest : true;
	const plannedSetsCount =
		todaySession && !todaySession.isRest
			? todaySession.exercises.reduce((sum, ex) => sum + ex.sets, 0)
			: 0;

	const templates = buildDailyQuestTemplates({
		dateKey: todayKey,
		isRestDay,
		sessionFocus: todaySession?.focus ?? null,
		plannedSetsCount,
	});

	await db.quest.createMany({
		data: templates.map((q) => ({
			userId,
			type: q.type,
			key: q.key,
			title: q.title,
			target: q.target,
			progress: 0,
			status: "PENDING",
			date: todayKey,
			xpReward: q.xpReward,
		})),
		skipDuplicates: true,
	});

	// Keep main daily quest synchronized with current session target/progress.
	const mainTemplate = templates[0];
	const existingMain = await db.quest.findUnique({
		where: {
			userId_key_date: { userId, key: mainTemplate.key, date: todayKey },
		},
	});
	if (existingMain && existingMain.status === "PENDING") {
		const setsDone = todayLog?.sets.length ?? 0;
		const nextProgress = Math.min(mainTemplate.target, setsDone);
		if (
			existingMain.target !== mainTemplate.target ||
			existingMain.title !== mainTemplate.title ||
			existingMain.progress !== nextProgress
		) {
			await db.quest.update({
				where: { id: existingMain.id },
				data: {
					title: mainTemplate.title,
					target: mainTemplate.target,
					progress: nextProgress,
				},
			});
		}
	}

	const [quests, stats] = await Promise.all([
		db.quest.findMany({
			where: { userId, date: todayKey },
			orderBy: [{ type: "asc" }, { createdAt: "asc" }],
		}),
		recalculateAndSaveUserStats(userId),
	]);

	return {
		todayKey,
		todayDayOfWeek,
		plan,
		todaySession,
		todayLog,
		quests,
		stats,
	};
}

export type CompleteQuestResult =
	| { ok: true; xpAwarded: number }
	| { ok: false; reason: "not_found" | "already_completed" };

export async function completeSideQuest(params: {
	userId: string;
	questId: string;
}): Promise<CompleteQuestResult> {
	const quest = await db.quest.findUnique({
		where: { id: params.questId },
	});
	if (!quest || quest.userId !== params.userId) {
		return { ok: false, reason: "not_found" };
	}
	if (quest.status === "COMPLETED") {
		return { ok: false, reason: "already_completed" };
	}

	await db.$transaction([
		db.quest.update({
			where: { id: quest.id },
			data: { status: "COMPLETED", progress: quest.target },
		}),
		db.xpEvent.upsert({
			where: {
				userId_source_refId: {
					userId: params.userId,
					source: "QUEST",
					refId: quest.id,
				},
			},
			create: {
				userId: params.userId,
				source: "QUEST",
				refId: quest.id,
				amount: quest.xpReward,
			},
			update: {},
		}),
	]);

	await recalculateAndSaveUserStats(params.userId);
	return { ok: true, xpAwarded: quest.xpReward };
}
