export const MOVEMENT_PATTERNS = [
	"PUSH",
	"PULL",
	"LEGS",
	"CORE",
	"SKILL",
	"MOBILITY",
] as const;

export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number];
export type ExperienceLevel = "NONE" | "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export const DIFFICULTY_BAND_BY_LEVEL: Record<
	ExperienceLevel,
	{ min: number; max: number }
> = {
	NONE: { min: 1, max: 3 },
	BEGINNER: { min: 1, max: 4 },
	INTERMEDIATE: { min: 2, max: 7 },
	ADVANCED: { min: 4, max: 10 },
};

export type EligibleExerciseInput = {
	difficulty: number;
	equipment: string[];
	contraindications: string[];
	status: "VERIFIED" | "UNVERIFIED";
};

export type EligibilityProfile = {
	experienceLevel: ExperienceLevel;
	equipment: string[];
	injuries: string[];
};

export function isBeginnerLevel(level: ExperienceLevel): boolean {
	return level === "NONE" || level === "BEGINNER";
}

/**
 * Pure safety & equipment eligibility check for assigning an exercise to a user.
 * Enforces the PRD rule: UNVERIFIED exercises are never assigned to beginners.
 */
export function isExerciseEligible(
	exercise: EligibleExerciseInput,
	profile: EligibilityProfile,
): boolean {
	if (
		exercise.status === "UNVERIFIED" &&
		isBeginnerLevel(profile.experienceLevel)
	) {
		return false;
	}

	const userEquipment = new Set(profile.equipment);
	const hasRequiredEquipment = exercise.equipment.every(
		(item) => item === "none" || userEquipment.has(item),
	);
	if (!hasRequiredEquipment) return false;

	const userInjuries = new Set(profile.injuries);
	const hasContraindication = exercise.contraindications.some((area) =>
		userInjuries.has(area),
	);
	if (hasContraindication) return false;

	const band = DIFFICULTY_BAND_BY_LEVEL[profile.experienceLevel];
	return exercise.difficulty >= band.min && exercise.difficulty <= band.max;
}

export function filterEligibleExercises<T extends EligibleExerciseInput>(
	exercises: readonly T[],
	profile: EligibilityProfile,
): T[] {
	return exercises.filter((exercise) => isExerciseEligible(exercise, profile));
}

export type ChainableExercise = {
	id: string;
	progressionNextId: string | null;
};

/**
 * Builds the full ordered progression chain containing `exerciseId`
 * by walking backward to the root and forward to the end, guarding against cycles.
 */
export function buildProgressionChain<T extends ChainableExercise>(
	exerciseId: string,
	allExercises: readonly T[],
): T[] {
	const byId = new Map(allExercises.map((ex) => [ex.id, ex]));
	const prevByNextId = new Map<string, T>();
	for (const ex of allExercises) {
		if (ex.progressionNextId && !prevByNextId.has(ex.progressionNextId)) {
			prevByNextId.set(ex.progressionNextId, ex);
		}
	}

	const start = byId.get(exerciseId);
	if (!start) return [];

	// Walk backward to the root of the chain.
	const seenBack = new Set<string>([start.id]);
	let root = start;
	while (true) {
		const prev = prevByNextId.get(root.id);
		if (!prev || seenBack.has(prev.id)) break;
		seenBack.add(prev.id);
		root = prev;
	}

	// Walk forward from root to end.
	const chain: T[] = [];
	const seenForward = new Set<string>();
	let current: T | undefined = root;
	while (current && !seenForward.has(current.id)) {
		seenForward.add(current.id);
		chain.push(current);
		current = current.progressionNextId
			? byId.get(current.progressionNextId)
			: undefined;
	}

	return chain;
}
