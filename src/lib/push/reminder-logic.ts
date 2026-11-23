import { z } from "zod";

export const REMINDER_TIME_PRESETS = [
	"07:00",
	"12:00",
	"17:00",
	"18:00",
	"19:00",
	"20:00",
] as const;

export const ReminderSettingsSchema = z.object({
	reminderEnabled: z.boolean(),
	reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

export type ReminderSettingsInput = z.infer<typeof ReminderSettingsSchema>;

export const PushSubscriptionPayloadSchema = z.object({
	endpoint: z.url(),
	keys: z.object({
		p256dh: z.string().min(1),
		auth: z.string().min(1),
	}),
});

export type PushSubscriptionPayload = z.infer<
	typeof PushSubscriptionPayloadSchema
>;

export type LocalTimeParts = {
	dateKey: string;
	dayOfWeek: number;
	timeHHmm: string;
	minutesOfDay: number;
};

export function parseTimeToMinutes(hhmm: string): number {
	const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
	if (!match) return 18 * 60;
	return Number(match[1]) * 60 + Number(match[2]);
}

export function getLocalTimeParts(
	timezone = "Asia/Jakarta",
	now = new Date(),
): LocalTimeParts {
	const buildFormatter = (tz: string) =>
		new Intl.DateTimeFormat("en-CA", {
			timeZone: tz,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});

	let parts: Intl.DateTimeFormatPart[];
	try {
		parts = buildFormatter(timezone).formatToParts(now);
	} catch {
		parts = buildFormatter("Asia/Jakarta").formatToParts(now);
	}

	const map = new Map(parts.map((p) => [p.type, p.value]));
	const year = map.get("year") ?? "1970";
	const month = map.get("month") ?? "01";
	const day = map.get("day") ?? "01";
	const rawHour = map.get("hour") ?? "00";
	const hour = rawHour === "24" ? "00" : rawHour.padStart(2, "0");
	const minute = (map.get("minute") ?? "00").padStart(2, "0");

	const dateKey = `${year}-${month}-${day}`;
	const dayOfWeek = new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
	const minutesOfDay = Number(hour) * 60 + Number(minute);

	return {
		dateKey,
		dayOfWeek,
		timeHHmm: `${hour}:${minute}`,
		minutesOfDay,
	};
}

export function shouldSendTrainingReminder(params: {
	reminderEnabled: boolean;
	reminderTime: string;
	trainingDays: readonly number[];
	lastReminderDate: string | null;
	hasCompletedSessionToday: boolean;
	localDateKey: string;
	localDayOfWeek: number;
	localMinutesOfDay: number;
	windowMinutes?: number;
}): boolean {
	if (!params.reminderEnabled) return false;
	if (!params.trainingDays.includes(params.localDayOfWeek)) return false;
	if (params.hasCompletedSessionToday) return false;
	if (params.lastReminderDate === params.localDateKey) return false;

	const targetMinutes = parseTimeToMinutes(params.reminderTime);
	const windowMinutes = params.windowMinutes ?? 60;

	return (
		params.localMinutesOfDay >= targetMinutes &&
		params.localMinutesOfDay < targetMinutes + windowMinutes
	);
}

export function shouldSendPeriodReminder(params: {
	tracksPeriod: boolean;
	periodReminderEnabled: boolean;
	daysUntilNextPeriod: number | null;
	lastPeriodReminderDate: string | null;
	reminderTime?: string | null;
	localDateKey: string;
	localMinutesOfDay: number;
	windowMinutes?: number;
}): boolean {
	if (!params.tracksPeriod || !params.periodReminderEnabled) return false;
	if (params.daysUntilNextPeriod !== 2) return false;
	if (params.lastPeriodReminderDate === params.localDateKey) return false;

	const targetMinutes = parseTimeToMinutes(params.reminderTime || "09:00");
	const windowMinutes = params.windowMinutes ?? 60;

	return (
		params.localMinutesOfDay >= targetMinutes &&
		params.localMinutesOfDay < targetMinutes + windowMinutes
	);
}
