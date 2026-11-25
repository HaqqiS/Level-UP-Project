import { describe, expect, it } from "vitest";
import {
	buildFallbackWeeklyPlan,
	computeSessionVolume,
	computeWeeklyVolume,
	enforceDailyAdjustmentBounds,
	enforceWeeklySafetyBounds,
	type PlanExerciseMeta,
} from "./plan-safety";

const exercises: PlanExerciseMeta[] = [
	{
		id: "push-1",
		name: "Wall Push-up",
		pattern: "PUSH",
		difficulty: 1,
		equipment: ["none"],
		measure: "REPS",
		contraindications: ["wrist"],
		status: "VERIFIED",
		progressionNextId: "push-2",
	},
	{
		id: "push-2",
		name: "Incline Push-up",
		pattern: "PUSH",
		difficulty: 2,
		equipment: ["none"],
		measure: "REPS",
		contraindications: ["wrist"],
		status: "VERIFIED",
		progressionNextId: "push-3",
	},
	{
		id: "push-3",
		name: "Knee Push-up",
		pattern: "PUSH",
		difficulty: 3,
		equipment: ["none"],
		measure: "REPS",
		contraindications: ["wrist"],
		status: "VERIFIED",
		progressionNextId: "push-4",
	},
	{
		id: "push-4",
		name: "Standard Push-up",
		pattern: "PUSH",
		difficulty: 4,
		equipment: ["none"],
		measure: "REPS",
		contraindications: ["wrist"],
		status: "VERIFIED",
		progressionNextId: null,
	},
	{
		id: "legs-1",
		name: "Bodyweight Squat",
		pattern: "LEGS",
		difficulty: 2,
		equipment: ["none"],
		measure: "REPS",
		contraindications: ["knee"],
		status: "VERIFIED",
		progressionNextId: null,
	},
	{
		id: "core-1",
		name: "Dead Bug",
		pattern: "CORE",
		difficulty: 1,
		equipment: ["none"],
		measure: "REPS",
		contraindications: [],
		status: "VERIFIED",
		progressionNextId: null,
	},
	{
		id: "pull-1",
		name: "Dead Hang",
		pattern: "PULL",
		difficulty: 1,
		equipment: ["pullup_bar"],
		measure: "SECONDS",
		contraindications: ["shoulder"],
		status: "VERIFIED",
		progressionNextId: null,
	},
];

const profile = {
	experienceLevel: "INTERMEDIATE" as const,
	trainingDays: [1, 3, 5],
	sessionMinutes: 30,
	goals: ["strength"],
};

describe("enforceWeeklySafetyBounds", () => {
	it("produces 7 days with rest days outside trainingDays and rejects unknown IDs", () => {
		const plan = enforceWeeklySafetyBounds({
			aiPlan: {
				notes: "Week 1",
				sessions: [
					{
						dayOfWeek: 1,
						focus: "Push",
						exercises: [
							{
								exerciseId: "unknown-id",
								sets: 3,
								targetReps: 10,
								restSeconds: 60,
							},
							{
								exerciseId: "push-2",
								sets: 3,
								targetReps: 10,
								restSeconds: 60,
							},
						],
					},
					{
						// Even if AI returns a session on a rest day, it must become isRest: true
						dayOfWeek: 2,
						focus: "Sneaky Day",
						exercises: [
							{
								exerciseId: "legs-1",
								sets: 3,
								targetReps: 10,
								restSeconds: 60,
							},
						],
					},
				],
			},
			profile,
			eligibleExercises: exercises,
			allExercises: exercises,
		});

		expect(plan.sessions).toHaveLength(7);
		const mon = plan.sessions.find((s) => s.dayOfWeek === 1);
		const tue = plan.sessions.find((s) => s.dayOfWeek === 2);
		const wed = plan.sessions.find((s) => s.dayOfWeek === 3);

		expect(mon?.isRest).toBe(false);
		expect(mon?.exercises.map((e) => e.exerciseId)).toEqual(["push-2"]);
		expect(tue?.isRest).toBe(true);
		expect(tue?.exercises).toHaveLength(0);
		// Missing training day (Wed) is filled via rule-based fallback
		expect(wed?.isRest).toBe(false);
		expect(wed?.exercises.length).toBeGreaterThan(0);
	});

	it("clamps progression jumps to at most 1 step over previous week", () => {
		const plan = enforceWeeklySafetyBounds({
			aiPlan: {
				notes: "Week 2",
				sessions: [
					{
						dayOfWeek: 1,
						focus: "Push",
						exercises: [
							// Jumping from push-1 straight to push-4 should clamp to push-2
							{ exerciseId: "push-4", sets: 3, targetReps: 8, restSeconds: 60 },
						],
					},
				],
			},
			profile,
			eligibleExercises: exercises,
			allExercises: exercises,
			previousWeekExerciseIds: new Set(["push-1"]),
		});

		const mon = plan.sessions.find((s) => s.dayOfWeek === 1);
		expect(mon?.exercises[0]?.exerciseId).toBe("push-2");
	});

	it("caps weekly volume growth at +10% over previous week", () => {
		const plan = enforceWeeklySafetyBounds({
			aiPlan: {
				notes: "High volume attempt",
				sessions: [1, 3, 5].map((dayOfWeek) => ({
					dayOfWeek,
					focus: "Push & Legs",
					exercises: [
						{ exerciseId: "push-2", sets: 5, targetReps: 20, restSeconds: 60 },
						{ exerciseId: "legs-1", sets: 5, targetReps: 20, restSeconds: 60 },
					],
				})),
			},
			profile,
			eligibleExercises: exercises,
			allExercises: exercises,
			previousWeekVolume: 100,
		});

		expect(computeWeeklyVolume(plan.sessions)).toBeLessThanOrEqual(110);
	});
});

describe("buildFallbackWeeklyPlan", () => {
	it("builds a valid 7-day plan using only eligible exercises", () => {
		const plan = buildFallbackWeeklyPlan({
			profile,
			eligibleExercises: exercises,
			allExercises: exercises,
			previousWeekVolume: 80,
		});
		expect(plan.sessions).toHaveLength(7);
		expect(plan.sessions.filter((s) => !s.isRest)).toHaveLength(3);
		expect(computeWeeklyVolume(plan.sessions)).toBeLessThanOrEqual(88);
	});

	it("prioritizes level 1 exercises and gentle volume for NONE (never trained) users", () => {
		const noneEligible = exercises.filter((e) => e.difficulty <= 2);
		const plan = buildFallbackWeeklyPlan({
			profile: {
				experienceLevel: "NONE",
				trainingDays: [1, 3, 5],
				sessionMinutes: 30,
				goals: ["strength"],
			},
			eligibleExercises: noneEligible,
			allExercises: exercises,
		});

		const trainingSessions = plan.sessions.filter((s) => !s.isRest);
		expect(trainingSessions).toHaveLength(3);
		const mon = trainingSessions[0];
		// Push day should pick Wall Push-up (difficulty 1) over Incline Push-up (difficulty 2)
		expect(mon.exercises[0]?.exerciseId).toBe("push-1");
		expect(mon.exercises[0]?.sets).toBe(2);
		expect(mon.exercises[0]?.targetReps).toBe(6);
		expect(mon.exercises[0]?.restSeconds).toBe(75);
	});
});

describe("enforceDailyAdjustmentBounds", () => {
	const planned = [
		{
			exerciseId: "push-2",
			sets: 3,
			targetReps: 10,
			targetSeconds: null,
			restSeconds: 60,
		},
		{
			exerciseId: "core-1",
			sets: 3,
			targetReps: 10,
			targetSeconds: null,
			restSeconds: 60,
		},
	];
	const baselineVolume = computeSessionVolume(planned); // 60

	it("removes exercises contraindicated by painAreas and clamps volume within -40% / +15%", () => {
		const adjustedTooLow = enforceDailyAdjustmentBounds({
			plannedExercises: planned,
			candidate: {
				focus: "Gentle Core",
				notes: "Avoiding wrists today.",
				exercises: [
					{ exerciseId: "push-2", sets: 3, targetReps: 10, restSeconds: 60 }, // wrist contraindication
					{ exerciseId: "core-1", sets: 1, targetReps: 5, restSeconds: 60 }, // volume 5 (< 60 * 0.60)
				],
			},
			eligibleExercises: exercises,
			painAreas: ["wrist"],
			baselineVolume,
		});

		expect(
			adjustedTooLow.exercises.some((e) => e.exerciseId === "push-2"),
		).toBe(false);
		const lowVol = computeSessionVolume(adjustedTooLow.exercises);
		expect(lowVol).toBeGreaterThanOrEqual(Math.ceil(baselineVolume * 0.6));
		expect(lowVol).toBeLessThanOrEqual(Math.floor(baselineVolume * 1.15));

		const adjustedTooHigh = enforceDailyAdjustmentBounds({
			plannedExercises: planned,
			candidate: {
				focus: "High Energy",
				notes: "Pushed hard.",
				exercises: [
					{ exerciseId: "legs-1", sets: 6, targetReps: 25, restSeconds: 60 }, // volume 150 (> 60 * 1.15)
				],
			},
			eligibleExercises: exercises,
			painAreas: [],
			baselineVolume,
		});

		const highVol = computeSessionVolume(adjustedTooHigh.exercises);
		expect(highVol).toBeLessThanOrEqual(Math.floor(baselineVolume * 1.15));
		expect(highVol).toBeGreaterThanOrEqual(Math.ceil(baselineVolume * 0.6));
	});

	it("excludes knee-contraindicated exercises when wellness pain areas are merged", () => {
		const adjusted = enforceDailyAdjustmentBounds({
			plannedExercises: planned,
			candidate: {
				focus: "Leg Swap",
				notes: "Skipping knee load.",
				exercises: [
					{ exerciseId: "legs-1", sets: 3, targetReps: 10, restSeconds: 60 },
					{ exerciseId: "core-1", sets: 3, targetReps: 10, restSeconds: 60 },
				],
			},
			eligibleExercises: exercises,
			painAreas: ["knee"],
			baselineVolume,
		});

		expect(adjusted.exercises.some((e) => e.exerciseId === "legs-1")).toBe(
			false,
		);
	});
});
