import { z } from "zod";
import type { MovementPattern } from "./eligibility";

export const MUSCLE_GROUPS = [
	"upper_chest",
	"mid_chest",
	"front_delts",
	"side_delts",
	"rear_delts",
	"upper_traps",
	"mid_lower_traps",
	"rhomboids",
	"lats",
	"erector_spinae",
	"serratus",
	"biceps",
	"brachialis",
	"triceps",
	"forearms",
	"upper_abs",
	"lower_abs",
	"obliques",
	"hip_flexors",
	"glute_max",
	"glute_med",
	"quads",
	"adductors",
	"hamstrings",
	"calves",
	"tibialis",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const MUSCLE_ROLES = ["PRIMARY", "SECONDARY", "STABILIZER"] as const;
export type MuscleRole = (typeof MUSCLE_ROLES)[number];

export const MASTERY_TIERS = ["BRONZE", "SILVER", "GOLD"] as const;
export type MasteryTier = (typeof MASTERY_TIERS)[number];

export const MUSCLE_METADATA: Record<
	MuscleGroup,
	{
		side: "front" | "back" | "both";
		region: "push" | "pull" | "arms" | "core" | "legs";
		legacyGroup: string;
	}
> = {
	upper_chest: { side: "front", region: "push", legacyGroup: "chest" },
	mid_chest: { side: "front", region: "push", legacyGroup: "chest" },
	front_delts: { side: "front", region: "push", legacyGroup: "front_delts" },
	side_delts: { side: "front", region: "push", legacyGroup: "side_delts" },
	rear_delts: { side: "back", region: "pull", legacyGroup: "rear_delts" },
	upper_traps: { side: "back", region: "pull", legacyGroup: "upper_back" },
	mid_lower_traps: { side: "back", region: "pull", legacyGroup: "upper_back" },
	rhomboids: { side: "back", region: "pull", legacyGroup: "upper_back" },
	lats: { side: "back", region: "pull", legacyGroup: "lats" },
	erector_spinae: { side: "back", region: "pull", legacyGroup: "lower_back" },
	serratus: { side: "front", region: "push", legacyGroup: "chest" },
	biceps: { side: "front", region: "arms", legacyGroup: "biceps" },
	brachialis: { side: "front", region: "arms", legacyGroup: "biceps" },
	triceps: { side: "back", region: "arms", legacyGroup: "triceps" },
	forearms: { side: "both", region: "arms", legacyGroup: "forearms" },
	upper_abs: { side: "front", region: "core", legacyGroup: "abs" },
	lower_abs: { side: "front", region: "core", legacyGroup: "abs" },
	obliques: { side: "front", region: "core", legacyGroup: "obliques" },
	hip_flexors: { side: "front", region: "core", legacyGroup: "hip_flexors" },
	glute_max: { side: "back", region: "legs", legacyGroup: "glutes" },
	glute_med: { side: "back", region: "legs", legacyGroup: "glutes" },
	quads: { side: "front", region: "legs", legacyGroup: "quads" },
	adductors: { side: "front", region: "legs", legacyGroup: "quads" },
	hamstrings: { side: "back", region: "legs", legacyGroup: "hamstrings" },
	calves: { side: "back", region: "legs", legacyGroup: "calves" },
	tibialis: { side: "front", region: "legs", legacyGroup: "calves" },
};

const VALID_MUSCLE_SET = new Set<string>(MUSCLE_GROUPS);

export const LEGACY_MUSCLE_ALIASES: Record<string, MuscleGroup> = {
	chest: "mid_chest",
	abs: "upper_abs",
	glutes: "glute_max",
	upper_back: "rhomboids",
	lower_back: "erector_spinae",
};

export function normalizeMuscleGroupId(raw: string): MuscleGroup | null {
	if (VALID_MUSCLE_SET.has(raw)) return raw as MuscleGroup;
	return LEGACY_MUSCLE_ALIASES[raw] ?? null;
}

export const ExerciseMuscleEntrySchema = z.object({
	muscleGroup: z.enum(MUSCLE_GROUPS),
	role: z.enum(MUSCLE_ROLES),
	activationWeight: z.number().int().min(1).max(100),
});

export type ExerciseMuscleEntry = z.output<typeof ExerciseMuscleEntrySchema>;

export const MasteryBenchmarkSpecSchema = z.object({
	tier: z.enum(MASTERY_TIERS),
	targetSets: z.number().int().min(1).max(8),
	targetReps: z.number().int().min(1).max(100).nullable().optional(),
	targetSeconds: z.number().int().min(5).max(300).nullable().optional(),
	minConsecutiveSessions: z.number().int().min(1).max(5).default(1),
	maxRpe: z.number().int().min(5).max(10).nullable().optional(),
	tempo: z.string().max(24).nullable().optional(),
	formStandard: z.string().max(160).nullable().optional(),
	unlocksNext: z.boolean().default(false),
});

export type MasteryBenchmarkSpec = z.output<typeof MasteryBenchmarkSpecSchema>;

export function deriveMuscleCacheArrays(
	entries: readonly ExerciseMuscleEntry[],
): {
	primaryMuscles: MuscleGroup[];
	secondaryMuscles: MuscleGroup[];
} {
	const primary = new Set<MuscleGroup>();
	const secondary = new Set<MuscleGroup>();

	for (const entry of entries) {
		if (entry.role === "PRIMARY") {
			primary.add(entry.muscleGroup);
			secondary.delete(entry.muscleGroup);
		} else if (!primary.has(entry.muscleGroup)) {
			secondary.add(entry.muscleGroup);
		}
	}

	return {
		primaryMuscles: [...primary],
		secondaryMuscles: [...secondary],
	};
}

export function buildDefaultMasteryBenchmarks(ex: {
	difficulty: number;
	measure: "REPS" | "SECONDS";
	formStandard?: string | null;
	tempo?: string | null;
}): MasteryBenchmarkSpec[] {
	const tempo = ex.tempo ?? (ex.measure === "REPS" ? "2-1-1-0" : null);
	const formStandard =
		ex.formStandard ??
		(ex.measure === "REPS"
			? "Full range of motion with controlled eccentric"
			: "Maintain aligned posture with steady breathing");

	if (ex.measure === "SECONDS") {
		const [bronzeSec, silverSec, goldSec] =
			ex.difficulty <= 3
				? [25, 45, 60]
				: ex.difficulty <= 6
					? [15, 30, 45]
					: [8, 15, 25];
		return [
			{
				tier: "BRONZE",
				targetSets: 3,
				targetReps: null,
				targetSeconds: bronzeSec,
				minConsecutiveSessions: 1,
				maxRpe: 9,
				tempo,
				formStandard,
				unlocksNext: true,
			},
			{
				tier: "SILVER",
				targetSets: 3,
				targetReps: null,
				targetSeconds: silverSec,
				minConsecutiveSessions: 2,
				maxRpe: 9,
				tempo,
				formStandard,
				unlocksNext: false,
			},
			{
				tier: "GOLD",
				targetSets: 4,
				targetReps: null,
				targetSeconds: goldSec,
				minConsecutiveSessions: 2,
				maxRpe: 8,
				tempo,
				formStandard,
				unlocksNext: false,
			},
		];
	}

	const [bronzeReps, silverReps, goldReps] =
		ex.difficulty <= 3
			? [8, 12, 15]
			: ex.difficulty <= 6
				? [6, 10, 12]
				: [3, 6, 8];

	return [
		{
			tier: "BRONZE",
			targetSets: 3,
			targetReps: bronzeReps,
			targetSeconds: null,
			minConsecutiveSessions: 1,
			maxRpe: 9,
			tempo,
			formStandard,
			unlocksNext: true,
		},
		{
			tier: "SILVER",
			targetSets: 3,
			targetReps: silverReps,
			targetSeconds: null,
			minConsecutiveSessions: 2,
			maxRpe: 9,
			tempo,
			formStandard,
			unlocksNext: false,
		},
		{
			tier: "GOLD",
			targetSets: 4,
			targetReps: goldReps,
			targetSeconds: null,
			minConsecutiveSessions: 2,
			maxRpe: 8,
			tempo,
			formStandard,
			unlocksNext: false,
		},
	];
}

export function inferFallbackMusclesByPattern(
	pattern: MovementPattern,
): ExerciseMuscleEntry[] {
	switch (pattern) {
		case "PUSH":
			return [
				{ muscleGroup: "mid_chest", role: "PRIMARY", activationWeight: 90 },
				{ muscleGroup: "front_delts", role: "PRIMARY", activationWeight: 80 },
				{ muscleGroup: "triceps", role: "PRIMARY", activationWeight: 85 },
				{ muscleGroup: "upper_abs", role: "STABILIZER", activationWeight: 45 },
			];
		case "PULL":
			return [
				{ muscleGroup: "lats", role: "PRIMARY", activationWeight: 90 },
				{ muscleGroup: "rhomboids", role: "PRIMARY", activationWeight: 80 },
				{ muscleGroup: "biceps", role: "SECONDARY", activationWeight: 65 },
				{ muscleGroup: "forearms", role: "STABILIZER", activationWeight: 55 },
			];
		case "LEGS":
			return [
				{ muscleGroup: "quads", role: "PRIMARY", activationWeight: 90 },
				{ muscleGroup: "glute_max", role: "PRIMARY", activationWeight: 85 },
				{ muscleGroup: "hamstrings", role: "SECONDARY", activationWeight: 60 },
				{ muscleGroup: "calves", role: "STABILIZER", activationWeight: 40 },
			];
		case "CORE":
			return [
				{ muscleGroup: "upper_abs", role: "PRIMARY", activationWeight: 90 },
				{ muscleGroup: "lower_abs", role: "PRIMARY", activationWeight: 85 },
				{ muscleGroup: "obliques", role: "SECONDARY", activationWeight: 60 },
				{
					muscleGroup: "hip_flexors",
					role: "STABILIZER",
					activationWeight: 50,
				},
			];
		case "SKILL":
			return [
				{ muscleGroup: "front_delts", role: "PRIMARY", activationWeight: 85 },
				{ muscleGroup: "upper_abs", role: "PRIMARY", activationWeight: 80 },
				{ muscleGroup: "serratus", role: "SECONDARY", activationWeight: 65 },
				{ muscleGroup: "forearms", role: "STABILIZER", activationWeight: 55 },
			];
		case "MOBILITY":
			return [
				{
					muscleGroup: "mid_lower_traps",
					role: "PRIMARY",
					activationWeight: 70,
				},
				{ muscleGroup: "hip_flexors", role: "PRIMARY", activationWeight: 70 },
				{
					muscleGroup: "erector_spinae",
					role: "SECONDARY",
					activationWeight: 50,
				},
			];
	}
}

export function inferDefaultMusclesAndMastery(ex: {
	slug?: string;
	pattern: MovementPattern;
	difficulty: number;
	measure: "REPS" | "SECONDS";
	muscles?: readonly ExerciseMuscleEntry[];
	masteryBenchmarks?: readonly MasteryBenchmarkSpec[];
}) {
	const muscles =
		ex.muscles && ex.muscles.length > 0
			? [...ex.muscles]
			: inferFallbackMusclesByPattern(ex.pattern);
	const masteryBenchmarks =
		ex.masteryBenchmarks && ex.masteryBenchmarks.length > 0
			? [...ex.masteryBenchmarks]
			: buildDefaultMasteryBenchmarks(ex);

	const silver =
		masteryBenchmarks.find((b) => b.tier === "SILVER") ?? masteryBenchmarks[0];
	const cache = deriveMuscleCacheArrays(muscles);

	return {
		muscles,
		masteryBenchmarks,
		primaryMuscles: cache.primaryMuscles,
		secondaryMuscles: cache.secondaryMuscles,
		masteryTargetSets: silver?.targetSets ?? 3,
		masteryTargetReps: silver?.targetReps ?? null,
		masteryTargetSeconds: silver?.targetSeconds ?? null,
	};
}
