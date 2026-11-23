import { describe, expect, it } from "vitest";
import {
	buildWeeklyWellnessTrendContext,
	buildWellnessAiContext,
	computeCyclePhaseForDate,
	computeSleepDurationMinutes,
	DailyWellnessLogInputSchema,
	formatSleepDuration,
	getVisiblePainTags,
	mapWellnessPainTagsToInjuryAreas,
	normalizePainTags,
	sanitizePainDetails,
	slugifyWellnessItemName,
	togglePainTag,
} from "./cycle-and-wellness";

describe("sleep duration calculator", () => {
	it("computes duration across midnight and same-day sleep", () => {
		expect(computeSleepDurationMinutes("23:30", "06:45")).toBe(435);
		expect(formatSleepDuration(435)).toBe("7h 15m");
		expect(computeSleepDurationMinutes("01:15", "08:00")).toBe(405);
		expect(computeSleepDurationMinutes("22:00", "22:00")).toBe(1440);
		expect(computeSleepDurationMinutes(null, "07:00")).toBeNull();
	});
});

describe("menstrual cycle phase calculator", () => {
	it("predicts menstrual, follicular, ovulatory, and luteal phases across cycles", () => {
		const base = {
			tracksPeriod: true,
			lastPeriodStartDate: "2026-11-01",
			averageCycleDays: 28,
			averagePeriodDays: 5,
		};

		expect(
			computeCyclePhaseForDate({ ...base, targetDateKey: "2026-11-01" }),
		).toEqual({
			phase: "menstrual",
			dayInCycle: 1,
			isPredictedPeriodDay: true,
		});
		expect(
			computeCyclePhaseForDate({ ...base, targetDateKey: "2026-11-05" }),
		).toEqual({
			phase: "menstrual",
			dayInCycle: 5,
			isPredictedPeriodDay: true,
		});
		expect(
			computeCyclePhaseForDate({ ...base, targetDateKey: "2026-11-10" })?.phase,
		).toBe("follicular");
		expect(
			computeCyclePhaseForDate({ ...base, targetDateKey: "2026-11-14" })?.phase,
		).toBe("ovulatory");
		expect(
			computeCyclePhaseForDate({ ...base, targetDateKey: "2026-11-22" })?.phase,
		).toBe("luteal");
		// Wraps smoothly into next cycle on day 29
		expect(
			computeCyclePhaseForDate({ ...base, targetDateKey: "2026-11-29" }),
		).toEqual({
			phase: "menstrual",
			dayInCycle: 1,
			isPredictedPeriodDay: true,
		});
	});

	it("returns null when period tracking is disabled", () => {
		expect(
			computeCyclePhaseForDate({
				tracksPeriod: false,
				lastPeriodStartDate: "2026-11-01",
				targetDateKey: "2026-11-03",
			}),
		).toBeNull();
	});
});

describe("wellness pain tags, custom items, and female visibility", () => {
	it("hides female-only tags when tracksPeriod is false", () => {
		const nonPeriodTags = getVisiblePainTags(false);
		expect(nonPeriodTags).not.toContain("cramps");
		expect(nonPeriodTags).not.toContain("ovulation");
		expect(nonPeriodTags).not.toContain("breast_tenderness");
		expect(getVisiblePainTags(true)).toContain("cramps");

		expect(
			normalizePainTags(["cramps", "headache", "lower_back"], false),
		).toEqual(["headache", "lower_back"]);
	});

	it("keeps pain_free mutually exclusive with symptom tags", () => {
		expect(togglePainTag(["headache"], "pain_free")).toEqual(["pain_free"]);
		expect(togglePainTag(["pain_free"], "lower_back")).toEqual(["lower_back"]);
		expect(normalizePainTags(["pain_free", "headache"], true)).toEqual([
			"pain_free",
		]);
	});

	it("maps structural pain tags to exercise injury contraindications", () => {
		expect(mapWellnessPainTagsToInjuryAreas(["lower_back", "leg"])).toEqual([
			"lower_back",
			"knee",
		]);
	});

	it("validates custom wellness item slugs and enriched DailyWellnessLogInput fields", () => {
		expect(slugifyWellnessItemName("Omega 3 + D3")).toBe("custom:omega_3_d3");

		const parsed = DailyWellnessLogInputSchema.safeParse({
			date: "2026-11-21",
			periodFlow: "medium",
			painTags: ["cramps", "lower_back"],
			painSeverity: 4,
			painDetails: { cramps: 4, lower_back: 3 },
			crampSeverity: 4,
			supplements: ["magnesium", "custom:creatine_monohydrate"],
			medications: ["painkillers"],
			sleepTime: "23:15",
			wakeTime: "06:30",
			sleepQuality: 4,
			energyLevel: 3,
			stressLevel: 2,
			moodTags: ["calm", "focused"],
			hydrationMl: 1750,
		});
		expect(parsed.success).toBe(true);

		expect(
			sanitizePainDetails(
				{ cramps: 4, lower_back: 3 },
				["cramps", "lower_back"],
				false,
			),
		).toEqual({ lower_back: 3 });
	});
});

describe("AI wellness context builders", () => {
	it("includes severity, sleep quality, readiness, and 7-day trend cues without medical claims", () => {
		const daily = buildWellnessAiContext({
			cyclePhase: { phase: "menstrual", dayInCycle: 2 },
			cycleRegularity: "IRREGULAR",
			log: {
				periodFlow: "heavy",
				crampSeverity: 4,
				painTags: ["lower_back"],
				painSeverity: 4,
				painDetails: { lower_back: 4 },
				sleepDurationMinutes: 330,
				sleepQuality: 2,
				energyLevel: 2,
				stressLevel: 4,
				moodTags: ["tired"],
				hydrationMl: 1000,
			},
		});

		expect(daily).toContain("irregular");
		expect(daily).toContain("cramp severity 4/5");
		expect(daily).toContain("overall severity 4/5");
		expect(daily).toContain("Sub-optimal sleep");
		expect(daily).toContain("energy 2/5");

		const trend = buildWeeklyWellnessTrendContext([
			{
				sleepDurationMinutes: 330,
				sleepQuality: 2,
				painTags: ["lower_back"],
				painSeverity: 4,
				energyLevel: 2,
				stressLevel: 4,
				medications: ["painkillers"],
			},
			{
				sleepDurationMinutes: 450,
				sleepQuality: 4,
				painTags: ["pain_free"],
				energyLevel: 4,
				stressLevel: 2,
			},
		]);

		expect(trend).toContain("Recent sleep trend");
		expect(trend).toContain("1 night(s) < 6h");
		expect(trend).toContain("lower_back (1d)");
		expect(trend).toContain("recent medications: painkillers");
	});
});
