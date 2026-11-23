import { FEMALE_BODY_MAP } from "./body-map-female";
import { MALE_BODY_MAP } from "./body-map-male";
import {
	type BodyClipRegion,
	type BodyClipShape,
	type BodyMapGender,
	type BodyMuscleRegion,
	type BodyViewModel,
	type GenderBodyMapModel,
	resolveBodyMapGender,
} from "./body-map-types";

export {
	type BodyClipRegion,
	type BodyClipShape,
	type BodyMapGender,
	type BodyMuscleRegion,
	type BodyViewModel,
	FEMALE_BODY_MAP,
	type GenderBodyMapModel,
	MALE_BODY_MAP,
	resolveBodyMapGender,
};

export const MUSCLE_REGION_PATHS: readonly BodyMuscleRegion[] = [
	...MALE_BODY_MAP.front.muscleRegions,
	...MALE_BODY_MAP.back.muscleRegions,
];

export function getBodyMapModel(gender: BodyMapGender): GenderBodyMapModel {
	return gender === "female" ? FEMALE_BODY_MAP : MALE_BODY_MAP;
}
