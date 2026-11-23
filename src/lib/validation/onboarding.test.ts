import { describe, expect, it } from "vitest";
import { OnboardingSchema } from "./onboarding";

const valid = {
	experienceLevel: "BEGINNER",
	goals: ["strength"],
	equipment: ["pullup_bar"],
	trainingDays: [1, 3, 5],
	sessionMinutes: 30,
	heightCm: 170,
	weightKg: 70,
	injuries: [],
	disclaimerAccepted: true,
} as const;

describe("OnboardingSchema", () => {
	it("accepts a valid payload", () => {
		expect(OnboardingSchema.safeParse(valid).success).toBe(true);
		expect(
			OnboardingSchema.safeParse({
				...valid,
				weightKg: 85.25,
				birthYear: 2005,
			}).success,
		).toBe(true);
		expect(
			OnboardingSchema.safeParse({
				...valid,
				sex: "female",
				tracksPeriod: true,
				lastPeriodStartDate: "2026-11-10",
				averageCycleDays: 29,
				averagePeriodDays: 5,
				cycleRegularity: "REGULAR",
			}).success,
		).toBe(true);
	});

	it("defaults cycleRegularity to UNKNOWN when omitted", () => {
		const res = OnboardingSchema.safeParse(valid);
		expect(res.success && res.data.cycleRegularity).toBe("UNKNOWN");
	});

	it("rejects weight with more than 2 decimal places", () => {
		expect(
			OnboardingSchema.safeParse({ ...valid, weightKg: 85.255 }).success,
		).toBe(false);
	});

	it("rejects without disclaimer acceptance", () => {
		expect(
			OnboardingSchema.safeParse({ ...valid, disclaimerAccepted: false })
				.success,
		).toBe(false);
		const { disclaimerAccepted: _, ...rest } = valid;
		expect(OnboardingSchema.safeParse(rest).success).toBe(false);
	});

	it.each([
		["too few days", { trainingDays: [1] }],
		["too many days", { trainingDays: [0, 1, 2, 3, 4, 5, 6] }],
		["duplicate days", { trainingDays: [1, 1, 3] }],
		["no goals", { goals: [] }],
		["no equipment", { equipment: [] }],
		["height too low", { heightCm: 99 }],
		["weight too high", { weightKg: 301 }],
		["invalid session length", { sessionMinutes: 20 }],
	])("rejects %s", (_, patch) => {
		expect(OnboardingSchema.safeParse({ ...valid, ...patch }).success).toBe(
			false,
		);
	});

	it("defaults injuries to empty array", () => {
		const { injuries: _, ...rest } = valid;
		const r = OnboardingSchema.safeParse(rest);
		expect(r.success && r.data.injuries).toEqual([]);
	});
});
