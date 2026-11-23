import { describe, expect, it } from "vitest";
import { MUSCLE_REGION_PATHS } from "@/components/features/muscles/body-map-paths";
import {
	computeExerciseMuscleMap,
	computeLoggedMuscleHeatmap,
	computeMuscleHeatmapSummary,
	computePlannedMuscleHeatmap,
	formatHeatmapDuration,
} from "./muscle-heatmap";
import { MUSCLE_GROUPS } from "./muscles";

describe("computeMuscleHeatmapSummary", () => {
	it("returns zero stats and untargeted muscles when empty", () => {
		const res = computeMuscleHeatmapSummary({
			plannedExercises: [],
			loggedSets: [],
			workoutsCount: 0,
		});
		expect(res.stats).toEqual({
			totalDurationSeconds: 0,
			workoutsCount: 0,
			totalSets: 0,
			totalReps: 0,
		});
		expect(res.primaryMuscles).toEqual([]);
		expect(res.secondaryMuscles).toEqual([]);
		expect(res.intensityByMuscle.mid_chest).toBe("untargeted");
	});

	it("prioritizes primary over secondary across 26 regions and legacy aliases", () => {
		const res = computeMuscleHeatmapSummary({
			plannedExercises: [
				{
					primaryMuscles: ["mid_chest", "triceps"],
					secondaryMuscles: ["upper_abs", "front_delts"],
				},
			],
			loggedSets: [
				{
					primaryMuscles: ["abs"],
					secondaryMuscles: ["obliques"],
					reps: null,
					seconds: 45,
				},
				{
					primaryMuscles: ["chest"],
					secondaryMuscles: ["front_delts"],
					reps: 10,
					seconds: null,
				},
			],
			workoutsCount: 1,
		});

		expect(res.intensityByMuscle.mid_chest).toBe("primary");
		expect(res.intensityByMuscle.triceps).toBe("primary");
		expect(res.intensityByMuscle.upper_abs).toBe("primary");
		expect(res.intensityByMuscle.front_delts).toBe("secondary");
		expect(res.intensityByMuscle.obliques).toBe("secondary");
		expect(res.intensityByMuscle.quads).toBe("untargeted");
		expect(res.stats).toEqual({
			totalDurationSeconds: 75,
			workoutsCount: 1,
			totalSets: 2,
			totalReps: 10,
		});
	});

	it("formats duration concisely", () => {
		expect(formatHeatmapDuration(0)).toBe("0s");
		expect(formatHeatmapDuration(45)).toBe("45s");
		expect(formatHeatmapDuration(125)).toBe("2m 5s");
		expect(formatHeatmapDuration(3660)).toBe("1h 1m");
	});
});

describe("computeLoggedMuscleHeatmap & ExerciseMuscle relational weights", () => {
	it("stays completely untargeted when 0 workouts are logged", () => {
		const res = computeLoggedMuscleHeatmap({ workouts: [] });
		expect(res.stats).toEqual({
			totalDurationSeconds: 0,
			workoutsCount: 0,
			totalSets: 0,
			totalReps: 0,
		});
		expect(res.primaryMuscles).toEqual([]);
		expect(res.secondaryMuscles).toEqual([]);
		for (const muscle of MUSCLE_GROUPS) {
			expect(res.intensityByMuscle[muscle]).toBe("untargeted");
		}
	});

	it("uses actual workout durationSeconds and relational ExerciseMuscle roles/weights", () => {
		const res = computeLoggedMuscleHeatmap({
			workouts: [
				{
					date: "2026-11-20",
					completed: true,
					durationSeconds: 1840,
					sets: [
						{
							exerciseId: "pushup",
							exerciseName: "Push-up",
							reps: 12,
							seconds: null,
							primaryMuscles: [],
							secondaryMuscles: [],
							muscles: [
								{
									muscleGroup: "mid_chest",
									role: "PRIMARY",
									activationWeight: 95,
								},
								{
									muscleGroup: "triceps",
									role: "SECONDARY",
									activationWeight: 70,
								},
								{
									muscleGroup: "upper_abs",
									role: "STABILIZER",
									activationWeight: 45,
								},
							],
						},
						{
							exerciseId: "pushup",
							exerciseName: "Push-up",
							reps: 10,
							seconds: null,
							primaryMuscles: [],
							secondaryMuscles: [],
							muscles: [
								{
									muscleGroup: "mid_chest",
									role: "PRIMARY",
									activationWeight: 95,
								},
								{
									muscleGroup: "triceps",
									role: "SECONDARY",
									activationWeight: 70,
								},
								{
									muscleGroup: "upper_abs",
									role: "STABILIZER",
									activationWeight: 45,
								},
							],
						},
					],
				},
				{
					date: "2026-11-21",
					completed: false,
					durationSeconds: null,
					sets: [
						{
							exerciseId: "plank",
							exerciseName: "Forearm Plank",
							reps: null,
							seconds: 40,
							primaryMuscles: ["upper_abs"],
							secondaryMuscles: ["obliques"],
						},
					],
				},
			],
		});

		// Completed duration 1840 + in-progress set fallback 40 = 1880; workoutsCount = 1 completed
		expect(res.stats).toEqual({
			totalDurationSeconds: 1880,
			workoutsCount: 1,
			totalSets: 3,
			totalReps: 22,
		});

		expect(res.intensityByMuscle.mid_chest).toBe("primary");
		expect(res.intensityByMuscle.triceps).toBe("secondary");
		expect(res.intensityByMuscle.upper_abs).toBe("primary"); // Elevated by Plank PRIMARY
		expect(res.intensityByMuscle.obliques).toBe("secondary");

		const chestDetail = res.detailsByMuscle.mid_chest;
		expect(chestDetail.highestRole).toBe("PRIMARY");
		expect(chestDetail.peakActivationWeight).toBe(95);
		expect(chestDetail.rawSets).toBe(2);
		expect(chestDetail.effectiveSets).toBe(1.9);
		expect(chestDetail.totalReps).toBe(22);
		expect(chestDetail.contributors[0]).toMatchObject({
			exerciseId: "pushup",
			sets: 2,
			reps: 22,
			effectiveSets: 1.9,
		});
	});
});

describe("computePlannedMuscleHeatmap, computeExerciseMuscleMap & SVG path coverage", () => {
	it("computes planned session targets and skips rest days", () => {
		const res = computePlannedMuscleHeatmap({
			sessions: [
				{ isRest: true, exercises: [] },
				{
					isRest: false,
					exercises: [
						{
							exerciseId: "pullup",
							exerciseName: "Pull-up",
							sets: 3,
							targetReps: 8,
							targetSeconds: null,
							restSeconds: 60,
							primaryMuscles: ["lats"],
							secondaryMuscles: ["biceps", "rhomboids"],
						},
					],
				},
			],
		});

		expect(res.stats.workoutsCount).toBe(1);
		expect(res.stats.totalSets).toBe(3);
		expect(res.stats.totalReps).toBe(24);
		expect(res.stats.totalDurationSeconds).toBe(3 * 24 + 2 * 60);
		expect(res.intensityByMuscle.lats).toBe("primary");
		expect(res.intensityByMuscle.biceps).toBe("secondary");
	});

	it("maps ExerciseDetailSheet muscles including STABILIZER to secondary visual tier", () => {
		const map = computeExerciseMuscleMap({
			primaryMuscles: [],
			secondaryMuscles: [],
			muscles: [
				{ muscleGroup: "quads", role: "PRIMARY", activationWeight: 95 },
				{ muscleGroup: "glute_max", role: "SECONDARY", activationWeight: 75 },
				{
					muscleGroup: "erector_spinae",
					role: "STABILIZER",
					activationWeight: 40,
				},
			],
		});
		expect(map.quads).toBe("primary");
		expect(map.glute_max).toBe("secondary");
		expect(map.erector_spinae).toBe("secondary");
		expect(map.mid_chest).toBe("untargeted");
	});

	it("covers all 26 anatomical MUSCLE_GROUPS in MUSCLE_REGION_PATHS", () => {
		const covered = new Set(MUSCLE_REGION_PATHS.map((r) => r.muscle));
		for (const muscle of MUSCLE_GROUPS) {
			expect(covered.has(muscle)).toBe(true);
		}
		for (const region of MUSCLE_REGION_PATHS) {
			expect(region.paths.length).toBeGreaterThan(0);
		}
	});
});
