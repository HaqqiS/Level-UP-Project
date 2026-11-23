import { describe, expect, it } from "vitest";
import {
	getLocalTimeParts,
	PushSubscriptionPayloadSchema,
	parseTimeToMinutes,
	ReminderSettingsSchema,
	shouldSendPeriodReminder,
	shouldSendTrainingReminder,
} from "./reminder-logic";

describe("push reminder schemas and time helpers", () => {
	it("validates reminder settings and push subscription payloads", () => {
		expect(
			ReminderSettingsSchema.safeParse({
				reminderEnabled: true,
				reminderTime: "18:30",
			}).success,
		).toBe(true);
		expect(
			ReminderSettingsSchema.safeParse({
				reminderEnabled: true,
				reminderTime: "25:00",
			}).success,
		).toBe(false);

		expect(
			PushSubscriptionPayloadSchema.safeParse({
				endpoint: "https://fcm.googleapis.com/fcm/send/example-token",
				keys: { p256dh: "key-123", auth: "auth-456" },
			}).success,
		).toBe(true);
		expect(
			PushSubscriptionPayloadSchema.safeParse({
				endpoint: "not-a-url",
				keys: { p256dh: "", auth: "auth-456" },
			}).success,
		).toBe(false);
	});

	it("extracts local date, day of week, and minutes in user timezone", () => {
		// 2026-11-20T11:15:00.000Z == 18:15 in Asia/Jakarta (UTC+7), Friday (5)
		const parts = getLocalTimeParts(
			"Asia/Jakarta",
			new Date("2026-11-20T11:15:00.000Z"),
		);
		expect(parts.dateKey).toBe("2026-11-20");
		expect(parts.dayOfWeek).toBe(5);
		expect(parts.timeHHmm).toBe("18:15");
		expect(parts.minutesOfDay).toBe(18 * 60 + 15);
		expect(parseTimeToMinutes("18:15")).toBe(18 * 60 + 15);
	});
});

describe("shouldSendTrainingReminder", () => {
	const base = {
		reminderEnabled: true,
		reminderTime: "18:00",
		trainingDays: [1, 3, 5],
		lastReminderDate: null,
		hasCompletedSessionToday: false,
		localDateKey: "2026-11-20",
		localDayOfWeek: 5,
		localMinutesOfDay: 18 * 60 + 10,
	};

	it("returns true on scheduled day within trigger window when not completed or sent", () => {
		expect(shouldSendTrainingReminder(base)).toBe(true);
	});

	it("returns false when disabled, on rest day, already completed, or already sent today", () => {
		expect(
			shouldSendTrainingReminder({ ...base, reminderEnabled: false }),
		).toBe(false);
		expect(shouldSendTrainingReminder({ ...base, localDayOfWeek: 4 })).toBe(
			false,
		);
		expect(
			shouldSendTrainingReminder({ ...base, hasCompletedSessionToday: true }),
		).toBe(false);
		expect(
			shouldSendTrainingReminder({
				...base,
				lastReminderDate: "2026-11-20",
			}),
		).toBe(false);
	});

	it("returns false before target time or after the window closes", () => {
		expect(
			shouldSendTrainingReminder({ ...base, localMinutesOfDay: 17 * 60 + 59 }),
		).toBe(false);
		expect(
			shouldSendTrainingReminder({ ...base, localMinutesOfDay: 19 * 60 }),
		).toBe(false);
	});
});

describe("shouldSendPeriodReminder", () => {
	const base = {
		tracksPeriod: true,
		periodReminderEnabled: true,
		daysUntilNextPeriod: 2,
		lastPeriodReminderDate: null,
		reminderTime: "09:00",
		localDateKey: "2026-11-27",
		localMinutesOfDay: 9 * 60 + 15,
	};

	it("returns true 2 days before predicted period inside window when not yet sent", () => {
		expect(shouldSendPeriodReminder(base)).toBe(true);
	});

	it("returns false when disabled, already sent, wrong day delta, or outside window", () => {
		expect(
			shouldSendPeriodReminder({ ...base, periodReminderEnabled: false }),
		).toBe(false);
		expect(shouldSendPeriodReminder({ ...base, tracksPeriod: false })).toBe(
			false,
		);
		expect(shouldSendPeriodReminder({ ...base, daysUntilNextPeriod: 3 })).toBe(
			false,
		);
		expect(
			shouldSendPeriodReminder({
				...base,
				lastPeriodReminderDate: "2026-11-27",
			}),
		).toBe(false);
		expect(
			shouldSendPeriodReminder({ ...base, localMinutesOfDay: 8 * 60 + 59 }),
		).toBe(false);
	});
});
