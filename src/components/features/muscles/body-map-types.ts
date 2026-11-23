import type { MuscleGroup } from "@/lib/exercises/muscles";

export type BodyMapGender = "male" | "female";

export function resolveBodyMapGender(sex?: string | null): BodyMapGender {
	return sex === "female" ? "female" : "male";
}

export type BodyClipShape =
	| { kind: "rect"; x: number; y: number; width: number; height: number }
	| { kind: "polygon"; points: string };

export type BodyClipRegion = {
	id: string;
	shape: BodyClipShape;
};

export type BodyMuscleRegion = {
	id: string;
	muscle: MuscleGroup;
	paths: readonly string[];
	clipId?: string;
};

export type BodyViewModel = {
	viewBox: string;
	outlinePaths: readonly string[];
	silhouettePaths: readonly string[];
	clipRegions: readonly BodyClipRegion[];
	muscleRegions: readonly BodyMuscleRegion[];
};

export type GenderBodyMapModel = {
	front: BodyViewModel;
	back: BodyViewModel;
};
