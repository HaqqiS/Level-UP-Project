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
