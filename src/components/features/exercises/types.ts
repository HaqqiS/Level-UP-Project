import type { MovementPattern } from "@/lib/exercises/eligibility";
import type { SkillTreeBenchmarkInput } from "@/lib/gamification/skill-tree";

export type ExerciseItem = {
	id: string;
	slug: string;
	name: string;
	pattern: MovementPattern;
	difficulty: number;
	equipment: string[];
	measure: "REPS" | "SECONDS";
	cues: string[];
	demoVideoId?: string | null;
	demoImages?: string[];
	contraindications: string[];
	primaryMuscles: string[];
	secondaryMuscles: string[];
	muscles?: {
		muscleGroup: string;
		role: "PRIMARY" | "SECONDARY" | "STABILIZER";
		activationWeight: number;
	}[];
	masteryTargetSets: number;
	masteryTargetReps: number | null;
	masteryTargetSeconds: number | null;
	branchKey?: string | null;
	treeTier?: number;
	masteryBenchmarks?: SkillTreeBenchmarkInput[];
	progressionNextId: string | null;
	status: "VERIFIED" | "UNVERIFIED";
	source: "SEED" | "AI";
	sourceUrl: string | null;
	license: string | null;
};
