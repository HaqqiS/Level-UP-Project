import { CORE_EXERCISES } from "./core";
import { SEED_EDGES } from "./edges";
import { FOUNDATION_EXERCISES } from "./foundations";
import { LEGS_EXERCISES } from "./legs";
import { EXERCISE_MEDIA_BY_SLUG, type ExerciseMediaEntry } from "./media";
import { PULL_EXERCISES } from "./pull";
import { PUSH_EXERCISES } from "./push";
import { SKILL_MOBILITY_EXERCISES } from "./skill-mobility";
import type { CuratedSeedEdge, CuratedSeedExercise } from "./types";

export const SEED_EXERCISES: CuratedSeedExercise[] = [
	...FOUNDATION_EXERCISES,
	...PUSH_EXERCISES,
	...PULL_EXERCISES,
	...LEGS_EXERCISES,
	...CORE_EXERCISES,
	...SKILL_MOBILITY_EXERCISES,
];

export type { CuratedSeedEdge, CuratedSeedExercise, ExerciseMediaEntry };
export { EXERCISE_MEDIA_BY_SLUG, SEED_EDGES };
