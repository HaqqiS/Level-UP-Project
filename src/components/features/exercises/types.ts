import type { MovementPattern } from "@/lib/exercises/eligibility";

export type ExerciseItem = {
	id: string;
	slug: string;
	name: string;
	pattern: MovementPattern;
	difficulty: number;
	equipment: string[];
	measure: "REPS" | "SECONDS";
	cues: string[];
	contraindications: string[];
	progressionNextId: string | null;
	status: "VERIFIED" | "UNVERIFIED";
	source: "SEED" | "AI";
	sourceUrl: string | null;
	license: string | null;
};
