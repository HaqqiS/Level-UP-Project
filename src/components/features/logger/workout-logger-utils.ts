export type LoggerExerciseSlot = {
	id: string;
	exerciseId: string;
	sets: number;
};

/**
 * Determines whether the workout logger accordion should advance after logging a set.
 * Advances ONLY when the logged exercise JUST reached its target set count
 * (`previousCount < target && newCount >= target`), never on partial sets (e.g. 1/2)
 * and never on bonus sets beyond the target.
 */
export function getNextAccordionItemAfterLog(params: {
	exercises: readonly LoggerExerciseSlot[];
	loggedPlannedId: string;
	loggedExerciseId: string;
	previousCount: number;
	newCount: number;
	countsByExerciseId: ReadonlyMap<string, number>;
}): string | null {
	const {
		exercises,
		loggedPlannedId,
		loggedExerciseId,
		previousCount,
		newCount,
		countsByExerciseId,
	} = params;

	const currentIndex = exercises.findIndex((ex) => ex.id === loggedPlannedId);
	if (currentIndex === -1) return null;

	const current = exercises[currentIndex];
	const justCompleted =
		previousCount < current.sets && newCount >= current.sets;
	if (!justCompleted) return null;

	const countFor = (exerciseId: string) =>
		exerciseId === loggedExerciseId
			? newCount
			: (countsByExerciseId.get(exerciseId) ?? 0);

	// Prefer the next incomplete exercise after the current one, then wrap around.
	for (let offset = 1; offset < exercises.length; offset++) {
		const candidate = exercises[(currentIndex + offset) % exercises.length];
		if (countFor(candidate.exerciseId) < candidate.sets) {
			return candidate.id;
		}
	}

	return null;
}
