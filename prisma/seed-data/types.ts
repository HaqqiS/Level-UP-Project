import type {
	ExerciseMuscleEntry,
	MasteryBenchmarkSpec,
	MasteryTier,
} from "../../src/lib/exercises/muscles";

export type SeedPattern =
	| "PUSH"
	| "PULL"
	| "LEGS"
	| "CORE"
	| "SKILL"
	| "MOBILITY";

export type SeedProgressionEdgeKind =
	| "PROGRESSION"
	| "PREREQUISITE"
	| "ALTERNATIVE";

export type CuratedSeedExercise = {
	slug: string;
	name: string;
	pattern: SeedPattern;
	difficulty: number;
	equipment: string[];
	measure: "REPS" | "SECONDS";
	cues: string[];
	contraindications: string[];
	branchKey: string;
	muscles: ExerciseMuscleEntry[];
	formStandard?: string;
	tempo?: string;
	masteryBenchmarks?: MasteryBenchmarkSpec[];
	nextSlug?: string;
	license: string;
	sourceUrl: string;
};

export type CuratedSeedEdge = {
	fromSlug: string;
	toSlug: string;
	kind: SeedProgressionEdgeKind;
	branchLabel?: string;
	requiredTier: MasteryTier;
	order: number;
};

export const FREE_EX_DB = "https://github.com/yuhonas/free-exercise-db";
export const WGER_DB = "https://wger.de/en/exercise/overview/";
export const UNLICENSE = "Unlicense (free-exercise-db)";
export const CC_BY_SA = "CC-BY-SA-4.0 (wger)";
