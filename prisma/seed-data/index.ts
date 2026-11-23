import { CORE_EXERCISES } from "./core";
import { SEED_EDGES } from "./edges";
import { LEGS_EXERCISES } from "./legs";
import { PULL_EXERCISES } from "./pull";
import { PUSH_EXERCISES } from "./push";
import { SKILL_MOBILITY_EXERCISES } from "./skill-mobility";
import type { CuratedSeedEdge, CuratedSeedExercise } from "./types";

export const SEED_EXERCISES: CuratedSeedExercise[] = [
	...PUSH_EXERCISES,
	...PULL_EXERCISES,
	...LEGS_EXERCISES,
	...CORE_EXERCISES,
	...SKILL_MOBILITY_EXERCISES,
];

export type { CuratedSeedEdge, CuratedSeedExercise };
export { SEED_EDGES };
