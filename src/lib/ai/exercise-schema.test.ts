import { describe, expect, it } from "vitest";
import {
	ExerciseCandidateSchema,
	isDuplicateExercise,
	normalizeSlug,
} from "./exercise-schema";

const validCandidate = {
	name: "Pseudo Planche Lean",
	slug: "pseudo-planche-lean",
	pattern: "PUSH",
	difficulty: 6,
	equipment: ["none"],
	measure: "SECONDS",
	cues: [
		"Protract shoulder blades fully",
		"Lean shoulders forward ahead of wrists",
	],
	contraindications: ["wrist", "shoulder"],
	sourceUrl: "https://example.com/planche-lean",
} as const;

describe("ExerciseCandidateSchema", () => {
	it("accepts a valid candidate", () => {
		expect(ExerciseCandidateSchema.safeParse(validCandidate).success).toBe(
			true,
		);
		expect(
			ExerciseCandidateSchema.safeParse({
				...validCandidate,
				muscles: [
					{ muscleGroup: "front_delts", role: "PRIMARY", activationWeight: 95 },
					{ muscleGroup: "upper_chest", role: "PRIMARY", activationWeight: 85 },
					{ muscleGroup: "serratus", role: "SECONDARY", activationWeight: 70 },
				],
				masteryBenchmarks: [
					{
						tier: "BRONZE",
						targetSets: 3,
						targetSeconds: 15,
						minConsecutiveSessions: 1,
						unlocksNext: true,
					},
					{
						tier: "SILVER",
						targetSets: 3,
						targetSeconds: 30,
						minConsecutiveSessions: 2,
						unlocksNext: false,
					},
					{
						tier: "GOLD",
						targetSets: 4,
						targetSeconds: 45,
						minConsecutiveSessions: 2,
						unlocksNext: false,
					},
				],
				suggestedPrerequisiteSlugs: ["pushup", "scapular-pushup"],
			}).success,
		).toBe(true);
	});

	it("rejects unknown equipment or injuries or invalid slug", () => {
		expect(
			ExerciseCandidateSchema.safeParse({
				...validCandidate,
				equipment: ["barbell"],
			}).success,
		).toBe(false);
		expect(
			ExerciseCandidateSchema.safeParse({
				...validCandidate,
				contraindications: ["neck"],
			}).success,
		).toBe(false);
		expect(
			ExerciseCandidateSchema.safeParse({
				...validCandidate,
				slug: "Upper Case Slug!",
			}).success,
		).toBe(false);
	});
});

describe("normalizeSlug & isDuplicateExercise", () => {
	it("normalizes names to kebab-case", () => {
		expect(normalizeSlug("  Archer Push-Up! ")).toBe("archer-push-up");
	});

	it("detects duplicates by slug or normalized name", () => {
		const existing = [{ slug: "pushup", name: "Standard Push-up" }];
		expect(
			isDuplicateExercise(
				{ slug: "standard-push-up", name: "Push-up" },
				existing,
			),
		).toBe(false);
		expect(
			isDuplicateExercise(
				{ slug: "pushup-alt", name: "Standard Pushup" },
				existing,
			),
		).toBe(true);
		expect(
			isDuplicateExercise({ slug: "pushup", name: "Other Name" }, existing),
		).toBe(true);
	});
});
