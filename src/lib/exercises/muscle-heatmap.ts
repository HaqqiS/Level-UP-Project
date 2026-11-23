import {
	MUSCLE_GROUPS,
	type MuscleGroup,
	type MuscleRole,
	normalizeMuscleGroupId,
} from "./muscles";

export type MuscleIntensity = "primary" | "secondary" | "untargeted";

export type ExerciseMuscleWeightInput = {
	muscleGroup: string;
	role: MuscleRole;
	activationWeight: number;
};

export type MuscleTargetInput = {
	primaryMuscles: readonly string[];
	secondaryMuscles: readonly string[];
	muscles?: readonly ExerciseMuscleWeightInput[];
};

export type LoggedSetHeatmapInput = MuscleTargetInput & {
	reps: number | null;
	seconds: number | null;
};

export type MuscleContributorItem = {
	exerciseId: string;
	exerciseName: string;
	role: MuscleRole;
	activationWeight: number;
	sets: number;
	reps: number;
	holdSeconds: number;
	effectiveSets: number;
};

export type MuscleBreakdownDetail = {
	muscle: MuscleGroup;
	intensity: MuscleIntensity;
	highestRole: MuscleRole | null;
	peakActivationWeight: number;
	rawSets: number;
	effectiveSets: number;
	totalReps: number;
	totalHoldSeconds: number;
	contributors: MuscleContributorItem[];
};

export type HeatmapSetInput = MuscleTargetInput & {
	exerciseId: string;
	exerciseName: string;
	reps: number | null;
	seconds: number | null;
};

export type HeatmapWorkoutInput = {
	date: string;
	completed: boolean;
	durationSeconds: number | null;
	sets: readonly HeatmapSetInput[];
};

export type HeatmapPlannedExerciseInput = MuscleTargetInput & {
	exerciseId: string;
	exerciseName: string;
	sets: number;
	targetReps: number | null;
	targetSeconds: number | null;
	restSeconds?: number;
};

export type MuscleHeatmapSummary = {
	intensityByMuscle: Record<MuscleGroup, MuscleIntensity>;
	detailsByMuscle: Record<MuscleGroup, MuscleBreakdownDetail>;
	primaryMuscles: MuscleGroup[];
	secondaryMuscles: MuscleGroup[];
	stats: {
		totalDurationSeconds: number;
		workoutsCount: number;
		totalSets: number;
		totalReps: number;
	};
};

const ROLE_RANK: Record<MuscleRole, number> = {
	PRIMARY: 3,
	SECONDARY: 2,
	STABILIZER: 1,
};

function roleToIntensity(role: MuscleRole): MuscleIntensity {
	return role === "PRIMARY" ? "primary" : "secondary";
}

export function formatHeatmapDuration(totalSeconds: number): string {
	const safe = Math.max(0, Math.round(totalSeconds));
	if (safe < 60) return `${safe}s`;
	const mins = Math.floor(safe / 60);
	const secs = safe % 60;
	if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
	const hours = Math.floor(mins / 60);
	const remMins = mins % 60;
	return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}

type ResolvedMuscleEntry = {
	muscle: MuscleGroup;
	role: MuscleRole;
	activationWeight: number;
};

export function resolveMuscleEntries(
	item: MuscleTargetInput,
): ResolvedMuscleEntry[] {
	const byMuscle = new Map<MuscleGroup, ResolvedMuscleEntry>();

	const upsert = (
		muscle: MuscleGroup,
		role: MuscleRole,
		activationWeight: number,
	) => {
		const existing = byMuscle.get(muscle);
		if (!existing) {
			byMuscle.set(muscle, { muscle, role, activationWeight });
			return;
		}
		if (ROLE_RANK[role] > ROLE_RANK[existing.role]) {
			byMuscle.set(muscle, {
				muscle,
				role,
				activationWeight: Math.max(activationWeight, existing.activationWeight),
			});
			return;
		}
		if (
			role === existing.role &&
			activationWeight > existing.activationWeight
		) {
			byMuscle.set(muscle, { muscle, role, activationWeight });
		}
	};

	if (item.muscles && item.muscles.length > 0) {
		for (const rawEntry of item.muscles) {
			const muscle = normalizeMuscleGroupId(rawEntry.muscleGroup);
			if (!muscle) continue;
			upsert(
				muscle,
				rawEntry.role,
				Math.max(1, Math.min(100, Math.round(rawEntry.activationWeight))),
			);
		}
		if (byMuscle.size > 0) {
			return [...byMuscle.values()];
		}
	}

	for (const raw of item.secondaryMuscles) {
		const muscle = normalizeMuscleGroupId(raw);
		if (muscle) upsert(muscle, "SECONDARY", 55);
	}
	for (const raw of item.primaryMuscles) {
		const muscle = normalizeMuscleGroupId(raw);
		if (muscle) upsert(muscle, "PRIMARY", 90);
	}

	return [...byMuscle.values()];
}

export function computeExerciseMuscleMap(
	exercise: MuscleTargetInput,
): Record<MuscleGroup, MuscleIntensity> {
	const intensityByMuscle = Object.fromEntries(
		MUSCLE_GROUPS.map((m) => [m, "untargeted"]),
	) as Record<MuscleGroup, MuscleIntensity>;

	for (const entry of resolveMuscleEntries(exercise)) {
		const nextIntensity = roleToIntensity(entry.role);
		if (
			nextIntensity === "primary" ||
			intensityByMuscle[entry.muscle] === "untargeted"
		) {
			intensityByMuscle[entry.muscle] = nextIntensity;
		}
	}

	return intensityByMuscle;
}

type MutableMuscleAccumulator = {
	highestRole: MuscleRole | null;
	peakActivationWeight: number;
	rawSets: number;
	rawEffectiveSets: number;
	totalReps: number;
	totalHoldSeconds: number;
	contributors: Map<
		string,
		{
			exerciseId: string;
			exerciseName: string;
			role: MuscleRole;
			activationWeight: number;
			sets: number;
			reps: number;
			holdSeconds: number;
			rawEffectiveSets: number;
		}
	>;
};

function createAccumulatorMap(): Record<MuscleGroup, MutableMuscleAccumulator> {
	return Object.fromEntries(
		MUSCLE_GROUPS.map((muscle) => [
			muscle,
			{
				highestRole: null,
				peakActivationWeight: 0,
				rawSets: 0,
				rawEffectiveSets: 0,
				totalReps: 0,
				totalHoldSeconds: 0,
				contributors: new Map(),
			} satisfies MutableMuscleAccumulator,
		]),
	) as Record<MuscleGroup, MutableMuscleAccumulator>;
}

function recordExerciseContribution(
	acc: Record<MuscleGroup, MutableMuscleAccumulator>,
	params: {
		exerciseId: string;
		exerciseName: string;
		sets: number;
		reps: number;
		holdSeconds: number;
		entries: readonly ResolvedMuscleEntry[];
	},
) {
	for (const entry of params.entries) {
		const bucket = acc[entry.muscle];
		if (
			!bucket.highestRole ||
			ROLE_RANK[entry.role] > ROLE_RANK[bucket.highestRole]
		) {
			bucket.highestRole = entry.role;
		}
		if (entry.activationWeight > bucket.peakActivationWeight) {
			bucket.peakActivationWeight = entry.activationWeight;
		}

		const effectiveIncrement = params.sets * (entry.activationWeight / 100);
		bucket.rawSets += params.sets;
		bucket.rawEffectiveSets += effectiveIncrement;
		bucket.totalReps += params.reps;
		bucket.totalHoldSeconds += params.holdSeconds;

		const prevContrib = bucket.contributors.get(params.exerciseId);
		if (!prevContrib) {
			bucket.contributors.set(params.exerciseId, {
				exerciseId: params.exerciseId,
				exerciseName: params.exerciseName,
				role: entry.role,
				activationWeight: entry.activationWeight,
				sets: params.sets,
				reps: params.reps,
				holdSeconds: params.holdSeconds,
				rawEffectiveSets: effectiveIncrement,
			});
		} else {
			if (ROLE_RANK[entry.role] > ROLE_RANK[prevContrib.role]) {
				prevContrib.role = entry.role;
			}
			prevContrib.activationWeight = Math.max(
				prevContrib.activationWeight,
				entry.activationWeight,
			);
			prevContrib.sets += params.sets;
			prevContrib.reps += params.reps;
			prevContrib.holdSeconds += params.holdSeconds;
			prevContrib.rawEffectiveSets += effectiveIncrement;
		}
	}
}

function finalizeHeatmapSummary(
	acc: Record<MuscleGroup, MutableMuscleAccumulator>,
	stats: MuscleHeatmapSummary["stats"],
): MuscleHeatmapSummary {
	const intensityByMuscle = Object.fromEntries(
		MUSCLE_GROUPS.map((muscle) => {
			const role = acc[muscle].highestRole;
			return [muscle, role ? roleToIntensity(role) : "untargeted"];
		}),
	) as Record<MuscleGroup, MuscleIntensity>;

	const detailsByMuscle = Object.fromEntries(
		MUSCLE_GROUPS.map((muscle) => {
			const bucket = acc[muscle];
			const contributors: MuscleContributorItem[] = [
				...bucket.contributors.values(),
			]
				.map((item) => ({
					exerciseId: item.exerciseId,
					exerciseName: item.exerciseName,
					role: item.role,
					activationWeight: item.activationWeight,
					sets: item.sets,
					reps: item.reps,
					holdSeconds: item.holdSeconds,
					effectiveSets: Math.round(item.rawEffectiveSets * 10) / 10,
				}))
				.sort(
					(a, b) =>
						b.effectiveSets - a.effectiveSets ||
						b.sets - a.sets ||
						b.activationWeight - a.activationWeight,
				);

			return [
				muscle,
				{
					muscle,
					intensity: intensityByMuscle[muscle],
					highestRole: bucket.highestRole,
					peakActivationWeight: bucket.peakActivationWeight,
					rawSets: bucket.rawSets,
					effectiveSets: Math.round(bucket.rawEffectiveSets * 10) / 10,
					totalReps: bucket.totalReps,
					totalHoldSeconds: bucket.totalHoldSeconds,
					contributors,
				} satisfies MuscleBreakdownDetail,
			];
		}),
	) as Record<MuscleGroup, MuscleBreakdownDetail>;

	const primaryMuscles = MUSCLE_GROUPS.filter(
		(m) => intensityByMuscle[m] === "primary",
	);
	const secondaryMuscles = MUSCLE_GROUPS.filter(
		(m) => intensityByMuscle[m] === "secondary",
	);

	return {
		intensityByMuscle,
		detailsByMuscle,
		primaryMuscles,
		secondaryMuscles,
		stats,
	};
}

function estimateSetDurationSeconds(set: {
	reps: number | null;
	seconds: number | null;
}): number {
	if (typeof set.seconds === "number" && set.seconds > 0) {
		return set.seconds;
	}
	if (typeof set.reps === "number" && set.reps > 0) {
		return Math.max(15, set.reps * 3);
	}
	return 0;
}

export function computeLoggedMuscleHeatmap(params: {
	workouts: readonly HeatmapWorkoutInput[];
}): MuscleHeatmapSummary {
	const acc = createAccumulatorMap();
	let totalDurationSeconds = 0;
	let workoutsCount = 0;
	let totalSets = 0;
	let totalReps = 0;

	for (const workout of params.workouts) {
		if (workout.completed) {
			workoutsCount += 1;
		}

		let estimatedDuration = 0;
		for (const set of workout.sets) {
			totalSets += 1;
			const reps = typeof set.reps === "number" && set.reps > 0 ? set.reps : 0;
			const holdSeconds =
				typeof set.seconds === "number" && set.seconds > 0 ? set.seconds : 0;
			totalReps += reps;
			estimatedDuration += estimateSetDurationSeconds(set);

			recordExerciseContribution(acc, {
				exerciseId: set.exerciseId,
				exerciseName: set.exerciseName,
				sets: 1,
				reps,
				holdSeconds,
				entries: resolveMuscleEntries(set),
			});
		}

		if (
			typeof workout.durationSeconds === "number" &&
			workout.durationSeconds > 0
		) {
			totalDurationSeconds += workout.durationSeconds;
		} else {
			totalDurationSeconds += estimatedDuration;
		}
	}

	return finalizeHeatmapSummary(acc, {
		totalDurationSeconds,
		workoutsCount,
		totalSets,
		totalReps,
	});
}

export function computePlannedMuscleHeatmap(params: {
	sessions: readonly {
		isRest: boolean;
		exercises: readonly HeatmapPlannedExerciseInput[];
	}[];
}): MuscleHeatmapSummary {
	const acc = createAccumulatorMap();
	let totalDurationSeconds = 0;
	let workoutsCount = 0;
	let totalSets = 0;
	let totalReps = 0;

	for (const session of params.sessions) {
		if (session.isRest || session.exercises.length === 0) continue;
		workoutsCount += 1;

		for (const ex of session.exercises) {
			const sets = Math.max(1, ex.sets);
			const repsPerSet =
				typeof ex.targetReps === "number" && ex.targetReps > 0
					? ex.targetReps
					: 0;
			const holdPerSet =
				typeof ex.targetSeconds === "number" && ex.targetSeconds > 0
					? ex.targetSeconds
					: 0;
			const reps = sets * repsPerSet;
			const holdSeconds = sets * holdPerSet;

			totalSets += sets;
			totalReps += reps;

			const activePerSet =
				holdPerSet > 0 ? holdPerSet : Math.max(15, repsPerSet * 3);
			const rest = Math.max(0, sets - 1) * (ex.restSeconds ?? 60);
			totalDurationSeconds += sets * activePerSet + rest;

			recordExerciseContribution(acc, {
				exerciseId: ex.exerciseId,
				exerciseName: ex.exerciseName,
				sets,
				reps,
				holdSeconds,
				entries: resolveMuscleEntries(ex),
			});
		}
	}

	return finalizeHeatmapSummary(acc, {
		totalDurationSeconds,
		workoutsCount,
		totalSets,
		totalReps,
	});
}

export function computeMuscleHeatmapSummary(params: {
	plannedExercises: readonly MuscleTargetInput[];
	loggedSets: readonly LoggedSetHeatmapInput[];
	workoutsCount: number;
}): MuscleHeatmapSummary {
	const acc = createAccumulatorMap();

	params.plannedExercises.forEach((ex, index) => {
		recordExerciseContribution(acc, {
			exerciseId: `planned-${index}`,
			exerciseName: "Planned Exercise",
			sets: 0,
			reps: 0,
			holdSeconds: 0,
			entries: resolveMuscleEntries(ex),
		});
	});

	let totalDurationSeconds = 0;
	let totalReps = 0;
	params.loggedSets.forEach((set, index) => {
		const reps = typeof set.reps === "number" && set.reps > 0 ? set.reps : 0;
		const holdSeconds =
			typeof set.seconds === "number" && set.seconds > 0 ? set.seconds : 0;
		totalDurationSeconds += estimateSetDurationSeconds(set);
		totalReps += reps;

		recordExerciseContribution(acc, {
			exerciseId: `logged-${index}`,
			exerciseName: "Logged Set",
			sets: 1,
			reps,
			holdSeconds,
			entries: resolveMuscleEntries(set),
		});
	});

	return finalizeHeatmapSummary(acc, {
		totalDurationSeconds,
		workoutsCount: Math.max(0, params.workoutsCount),
		totalSets: params.loggedSets.length,
		totalReps,
	});
}
