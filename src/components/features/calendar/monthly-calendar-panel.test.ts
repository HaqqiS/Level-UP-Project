import { describe, expect, it } from "vitest";
import type {
	CalendarDayLogView,
	CalendarDaySummary,
} from "@/server/services/wellness-service";
import {
	type CalendarDayVisualState,
	getCalendarDayButtonAppearance,
	getCalendarDayVisualState,
	getIndicatorPresentation,
	getVisibleCalendarIndicators,
} from "./monthly-calendar-panel";

function makeDay(
	overrides: Partial<CalendarDaySummary> = {},
): CalendarDaySummary {
	return {
		dateKey: "2026-11-10",
		dayOfMonth: 10,
		dayOfWeek: 2,
		inCurrentMonth: true,
		isToday: false,
		hasWorkout: false,
		isScheduledTraining: false,
		isStreakFrozen: false,
		hasWellnessLog: false,
		workoutSummary: null,
		cyclePhase: null,
		log: null,
		...overrides,
	};
}

function makeLog(
	overrides: Partial<CalendarDayLogView> = {},
): CalendarDayLogView {
	return {
		date: "2026-11-10",
		periodFlow: null,
		painTags: [],
		painSeverity: null,
		painDetails: null,
		crampSeverity: null,
		medications: [],
		supplements: [],
		sleepTime: null,
		wakeTime: null,
		sleepDurationMinutes: null,
		sleepQuality: null,
		energyLevel: null,
		stressLevel: null,
		moodTags: [],
		hydrationMl: null,
		notes: null,
		...overrides,
	};
}

describe("getCalendarDayVisualState", () => {
	it("derives confirmed and predicted period only when tracksPeriod is true", () => {
		const dayWithConfirmed = makeDay({
			cyclePhase: {
				phase: "menstrual",
				dayInCycle: 1,
				isConfirmedPeriodDay: true,
				isPredictedPeriodDay: false,
				confidence: "high",
				predictionWindowDays: 1,
			},
		});
		const dayWithPredicted = makeDay({
			cyclePhase: {
				phase: "menstrual",
				dayInCycle: 1,
				isConfirmedPeriodDay: false,
				isPredictedPeriodDay: true,
				confidence: "medium",
				predictionWindowDays: 2,
			},
		});

		expect(
			getCalendarDayVisualState({
				day: dayWithConfirmed,
				dayLog: null,
				selectedDateKey: "2026-11-01",
				tracksPeriod: true,
			}),
		).toMatchObject({
			hasConfirmedPeriod: true,
			isPredictedPeriod: false,
		});

		expect(
			getCalendarDayVisualState({
				day: dayWithPredicted,
				dayLog: null,
				selectedDateKey: "2026-11-01",
				tracksPeriod: false,
			}),
		).toMatchObject({
			hasConfirmedPeriod: false,
			isPredictedPeriod: false,
		});
	});

	it("clears hasConfirmedPeriod immediately when local dayLog removes periodFlow", () => {
		const serverConfirmedDay = makeDay({
			cyclePhase: {
				phase: "menstrual",
				dayInCycle: 1,
				isConfirmedPeriodDay: true,
				isPredictedPeriodDay: false,
				confidence: "high",
				predictionWindowDays: 1,
			},
			log: makeLog({ periodFlow: "medium" }),
		});

		const visualState = getCalendarDayVisualState({
			day: serverConfirmedDay,
			dayLog: makeLog({ periodFlow: null }),
			selectedDateKey: "2026-11-10",
			tracksPeriod: true,
		});

		expect(visualState.hasConfirmedPeriod).toBe(false);
	});

	it("excludes pain_free when determining hasPain and tracks supplements/medication", () => {
		const painFreeOnly = makeLog({ painTags: ["pain_free"] });
		expect(
			getCalendarDayVisualState({
				day: makeDay(),
				dayLog: painFreeOnly,
				selectedDateKey: "2026-11-01",
				tracksPeriod: false,
			}),
		).toMatchObject({
			hasPain: false,
			hasSupplements: false,
			hasMedication: false,
		});

		const richLog = makeLog({
			painTags: ["lower_back"],
			supplements: ["magnesium"],
			medications: ["painkillers"],
		});
		expect(
			getCalendarDayVisualState({
				day: makeDay(),
				dayLog: richLog,
				selectedDateKey: "2026-11-01",
				tracksPeriod: false,
			}),
		).toMatchObject({
			hasPain: true,
			hasSupplements: true,
			hasMedication: true,
		});
	});
});

describe("getCalendarDayButtonAppearance", () => {
	const baseState: CalendarDayVisualState = {
		isSelected: false,
		hasConfirmedPeriod: true,
		isPredictedPeriod: false,
		hasPain: true,
		hasSupplements: true,
		hasMedication: true,
	};

	it("never adds outline variant or ring/border classes, and restricts fills to workout/freeze/selected", () => {
		const restPeriodOnly = getCalendarDayButtonAppearance({
			day: makeDay({ isToday: true }),
			state: baseState,
			layout: "strip",
		});

		expect(restPeriodOnly.variant).toBe("ghost");
		expect(restPeriodOnly.className).not.toContain("ring-");
		expect(restPeriodOnly.className).not.toContain("border-");
		expect(restPeriodOnly.className).not.toContain("bg-rose-");
		expect(restPeriodOnly.className).not.toContain("bg-emerald-");
		expect(restPeriodOnly.className).not.toContain("bg-sky-");

		const workoutAppearance = getCalendarDayButtonAppearance({
			day: makeDay({ hasWorkout: true }),
			state: baseState,
			layout: "month",
		});
		expect(workoutAppearance.variant).toBe("ghost");
		expect(workoutAppearance.className).toContain("bg-emerald-500/");

		const freezeAppearance = getCalendarDayButtonAppearance({
			day: makeDay({ isStreakFrozen: true }),
			state: baseState,
			layout: "month",
		});
		expect(freezeAppearance.variant).toBe("ghost");
		expect(freezeAppearance.className).toContain("bg-sky-500/");
		expect(freezeAppearance.className).not.toContain("ring-");
	});
});

describe("getVisibleCalendarIndicators & getIndicatorPresentation", () => {
	const richState: CalendarDayVisualState = {
		isSelected: false,
		hasConfirmedPeriod: true,
		isPredictedPeriod: false,
		hasPain: true,
		hasSupplements: true,
		hasMedication: true,
	};

	it("keeps predicted period always visible even when all filter badges are off, while hiding confirmed period", () => {
		expect(getVisibleCalendarIndicators(richState, [])).toEqual([]);
		expect(
			getVisibleCalendarIndicators(
				{
					...richState,
					hasConfirmedPeriod: false,
					isPredictedPeriod: true,
				},
				[],
			),
		).toEqual(["period_predicted"]);
	});

	it("shows confirmed period and wellness indicators matching active multi-select filters", () => {
		expect(
			getVisibleCalendarIndicators(richState, ["pain", "medication"]),
		).toEqual(["pain", "medication"]);

		expect(
			getVisibleCalendarIndicators(richState, ["period", "supplements"]),
		).toEqual(["period_confirmed", "supplements"]);

		expect(
			getVisibleCalendarIndicators(
				{
					...richState,
					hasConfirmedPeriod: false,
					isPredictedPeriod: true,
				},
				["period", "supplements"],
			),
		).toEqual(["period_predicted", "supplements"]);
	});

	it("uses solid fill for confirmed period on both selected and unselected days, and hollow stroke for predicted", () => {
		expect(
			getIndicatorPresentation("period_confirmed", false).colorClass,
		).toContain("fill-current");
		expect(
			getIndicatorPresentation("period_confirmed", true).colorClass,
		).toContain("fill-current");
		expect(
			getIndicatorPresentation("period_predicted", false).colorClass,
		).toContain("fill-none");
		expect(
			getIndicatorPresentation("period_predicted", true).colorClass,
		).toContain("fill-none");
	});
});
