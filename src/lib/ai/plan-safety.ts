import {
	buildProgressionChain,
	type EligibleExerciseInput,
	type ExperienceLevel,
	type MovementPattern,
} from "@/lib/exercises/eligibility";
import type {
	AdjustedSessionAi,
	PlannedExerciseAi,
	WeeklyPlanAi,
} from "./plan-schema";

export type PlanExerciseMeta = EligibleExerciseInput & {
	id: string;
	name: string;
	pattern: MovementPattern;
	measure: "REPS" | "SECONDS";
	progressionNextId: string | null;
};

export type NormalizedPlannedExercise = {
	exerciseId: string;
	sets: number;
	targetReps: number | null;
	targetSeconds: number | null;
	restSeconds: number;
};

export type SafePlannedSession = {
	dayOfWeek: number;
	focus: string;
	notes: string | null;
	isRest: boolean;
	baselineVolume: number;
	exercises: NormalizedPlannedExercise[];
};

export type SafeWeeklyPlan = {
	notes: string;
	sessions: SafePlannedSession[];
};

export type PlanProfileInput = {
	experienceLevel: ExperienceLevel;
	trainingDays: number[];
	sessionMinutes: number;
	goals: string[];
};

const ORDERED_WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0] as const;

const FOCUS_ROTATION: {
	focus: string;
	patterns: MovementPattern[];
}[] = [
	{ focus: "Upper Push & Core", patterns: ["PUSH", "CORE", "MOBILITY"] },
	{ focus: "Lower Body & Mobility", patterns: ["LEGS", "MOBILITY", "CORE"] },
	{ focus: "Upper Pull & Skill", patterns: ["PULL", "SKILL", "CORE"] },
	{
		focus: "Full Body Calisthenics",
		patterns: ["PUSH", "PULL", "LEGS", "CORE"],
	},
];

function clampInt(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, Math.round(value)));
}

export function computeExerciseVolume(ex: {
	sets: number;
	targetReps?: number | null;
	targetSeconds?: number | null;
}): number {
	const unit =
		ex.targetReps && ex.targetReps > 0
			? ex.targetReps
			: Math.max(1, Math.round((ex.targetSeconds ?? 30) / 5));
	return Math.max(1, ex.sets) * unit;
}

export function computeSessionVolume(
	exercises: readonly {
		sets: number;
		targetReps?: number | null;
		targetSeconds?: number | null;
	}[],
): number {
	return exercises.reduce((sum, ex) => sum + computeExerciseVolume(ex), 0);
}

export function computeWeeklyVolume(
	sessions: readonly { exercises: readonly NormalizedPlannedExercise[] }[],
): number {
	return sessions.reduce(
		(sum, session) => sum + computeSessionVolume(session.exercises),
		0,
	);
}

export function normalizePlannedExercise(
	raw: Pick<
		PlannedExerciseAi,
		"exerciseId" | "sets" | "targetReps" | "targetSeconds" | "restSeconds"
	>,
	meta: Pick<PlanExerciseMeta, "measure">,
): NormalizedPlannedExercise {
	const sets = clampInt(raw.sets, 1, 6);
	const restSeconds = clampInt(raw.restSeconds ?? 60, 30, 180);

	if (meta.measure === "SECONDS") {
		return {
			exerciseId: raw.exerciseId,
			sets,
			targetReps: null,
			targetSeconds: clampInt(raw.targetSeconds ?? 30, 10, 180),
			restSeconds,
		};
	}

	return {
		exerciseId: raw.exerciseId,
		sets,
		targetReps: clampInt(raw.targetReps ?? 8, 1, 30),
		targetSeconds: null,
		restSeconds,
	};
}

/**
 * Ensures any exercise in a progression chain advances at most 1 step
 * compared to the previous week's highest completed/assigned step in that chain.
 */
export function clampProgressionStep(
	chosenId: string,
	allExercises: readonly PlanExerciseMeta[],
	eligibleIds: ReadonlySet<string>,
	previousExerciseIds: ReadonlySet<string>,
): string {
	if (previousExerciseIds.size === 0) return chosenId;
	const chain = buildProgressionChain(chosenId, allExercises);
	if (chain.length <= 1) return chosenId;

	const chosenIndex = chain.findIndex((ex) => ex.id === chosenId);
	let highestPrevIndex = -1;
	for (let i = 0; i < chain.length; i++) {
		if (previousExerciseIds.has(chain[i].id)) {
			highestPrevIndex = i;
		}
	}

	if (highestPrevIndex === -1 || chosenIndex <= highestPrevIndex + 1) {
		return chosenId;
	}

	const nextAllowed = chain[highestPrevIndex + 1];
	if (nextAllowed && eligibleIds.has(nextAllowed.id)) {
		return nextAllowed.id;
	}
	const prev = chain[highestPrevIndex];
	return prev && eligibleIds.has(prev.id) ? prev.id : chosenId;
}

export function scaleExercisesToVolumeRange(
	exercises: readonly NormalizedPlannedExercise[],
	minVolume: number,
	maxVolume: number,
): NormalizedPlannedExercise[] {
	if (exercises.length === 0) return [];
	const items = exercises.map((ex) => ({ ...ex }));

	let guard = 0;
	while (computeSessionVolume(items) > maxVolume && guard < 400) {
		guard++;
		// Reduce from the highest-volume exercise first.
		let bestIdx = -1;
		let bestVol = 0;
		for (let i = 0; i < items.length; i++) {
			const ex = items[i];
			const canReduceRep = ex.targetReps !== null && ex.targetReps > 1;
			const canReduceSec = ex.targetSeconds !== null && ex.targetSeconds > 10;
			const canReduceSet = ex.sets > 1;
			if (!canReduceRep && !canReduceSec && !canReduceSet) continue;
			const v = computeExerciseVolume(ex);
			if (v > bestVol) {
				bestVol = v;
				bestIdx = i;
			}
		}
		if (bestIdx === -1) break;

		const target = items[bestIdx];
		if (target.targetReps !== null && target.targetReps > 4) {
			target.targetReps -= 1;
		} else if (target.targetSeconds !== null && target.targetSeconds > 15) {
			target.targetSeconds -= 5;
		} else if (target.sets > 1) {
			target.sets -= 1;
		} else if (target.targetReps !== null && target.targetReps > 1) {
			target.targetReps -= 1;
		} else if (target.targetSeconds !== null && target.targetSeconds > 10) {
			target.targetSeconds = Math.max(10, target.targetSeconds - 5);
		}
	}

	guard = 0;
	while (computeSessionVolume(items) < minVolume && guard < 400) {
		guard++;
		let changed = false;
		for (const item of items) {
			if (computeSessionVolume(items) >= minVolume) break;
			const currentTotal = computeSessionVolume(items);
			if (
				item.sets < 4 &&
				currentTotal + computeExerciseVolume({ ...item, sets: 1 }) <= maxVolume
			) {
				item.sets += 1;
				changed = true;
			} else if (
				item.targetReps !== null &&
				item.targetReps < 30 &&
				currentTotal + item.sets <= maxVolume
			) {
				item.targetReps += 1;
				changed = true;
			} else if (
				item.targetSeconds !== null &&
				item.targetSeconds < 180 &&
				currentTotal + item.sets <= maxVolume
			) {
				item.targetSeconds = Math.min(180, item.targetSeconds + 5);
				changed = true;
			}
		}
		if (!changed) break;
	}

	return items;
}

const BEGINNER_FOCUS_ROTATION: {
	focus: string;
	patterns: MovementPattern[];
}[] = [
	{ focus: "Upper Push & Core", patterns: ["PUSH", "CORE", "MOBILITY"] },
	{ focus: "Lower Body & Mobility", patterns: ["LEGS", "MOBILITY", "CORE"] },
	{ focus: "Upper Pull & Mobility", patterns: ["PULL", "MOBILITY", "CORE"] },
	{
		focus: "Full Body Fundamentals",
		patterns: ["PUSH", "LEGS", "PULL", "CORE"],
	},
];

function buildRuleBasedSessionExercises(params: {
	rotationIndex: number;
	sessionMinutes: number;
	experienceLevel: ExperienceLevel;
	goals: readonly string[];
	eligibleExercises: readonly PlanExerciseMeta[];
	allExercises: readonly PlanExerciseMeta[];
	previousWeekExerciseIds: ReadonlySet<string>;
}): { focus: string; exercises: NormalizedPlannedExercise[] } {
	const {
		rotationIndex,
		sessionMinutes,
		experienceLevel,
		goals,
		eligibleExercises,
		allExercises,
		previousWeekExerciseIds,
	} = params;
	const useGentleRotation =
		experienceLevel === "NONE" && !goals.includes("skills");
	const rotation = useGentleRotation ? BEGINNER_FOCUS_ROTATION : FOCUS_ROTATION;
	const template = rotation[rotationIndex % rotation.length];
	const targetCount = sessionMinutes <= 15 ? 3 : sessionMinutes <= 30 ? 4 : 5;
	const defaultSets =
		experienceLevel === "NONE"
			? 2
			: experienceLevel === "BEGINNER"
				? sessionMinutes >= 45
					? 3
					: 2
				: sessionMinutes >= 45
					? 4
					: 3;
	const defaultReps =
		experienceLevel === "NONE" ? 6 : experienceLevel === "BEGINNER" ? 8 : 10;
	const defaultSeconds =
		experienceLevel === "NONE" ? 20 : experienceLevel === "BEGINNER" ? 25 : 30;
	const defaultRestSeconds = experienceLevel === "NONE" ? 75 : 60;
	const eligibleIds = new Set(eligibleExercises.map((e) => e.id));

	// Sort easiest-first so beginners and "never trained" users start at level 1.
	const sortedEligible = [...eligibleExercises].sort(
		(a, b) => a.difficulty - b.difficulty || a.name.localeCompare(b.name),
	);

	const picked: PlanExerciseMeta[] = [];
	const usedIds = new Set<string>();

	for (const pattern of template.patterns) {
		if (picked.length >= targetCount) break;
		const candidates = sortedEligible.filter(
			(ex) => ex.pattern === pattern && !usedIds.has(ex.id),
		);
		if (candidates.length === 0) continue;
		// For NONE ("never trained"), prefer the lowest-difficulty tier available in this pattern.
		const pool =
			experienceLevel === "NONE"
				? candidates.filter((ex) => ex.difficulty === candidates[0].difficulty)
				: candidates;
		const chosen = pool[rotationIndex % pool.length] ?? candidates[0];
		const clampedId = clampProgressionStep(
			chosen.id,
			allExercises,
			eligibleIds,
			previousWeekExerciseIds,
		);
		const finalEx = sortedEligible.find((e) => e.id === clampedId) ?? chosen;
		if (!usedIds.has(finalEx.id)) {
			picked.push(finalEx);
			usedIds.add(finalEx.id);
		}
	}

	for (const ex of sortedEligible) {
		if (picked.length >= targetCount) break;
		if (useGentleRotation && ex.pattern === "SKILL") continue;
		if (!usedIds.has(ex.id)) {
			picked.push(ex);
			usedIds.add(ex.id);
		}
	}

	for (const ex of sortedEligible) {
		if (picked.length >= targetCount) break;
		if (!usedIds.has(ex.id)) {
			picked.push(ex);
			usedIds.add(ex.id);
		}
	}

	const exercises = picked.map((ex) =>
		normalizePlannedExercise(
			{
				exerciseId: ex.id,
				sets: defaultSets,
				targetReps: ex.measure === "REPS" ? defaultReps : null,
				targetSeconds: ex.measure === "SECONDS" ? defaultSeconds : null,
				restSeconds: defaultRestSeconds,
			},
			ex,
		),
	);

	return { focus: template.focus, exercises };
}

function capWeeklyVolume(
	sessions: SafePlannedSession[],
	previousWeekVolume?: number | null,
): SafePlannedSession[] {
	if (!previousWeekVolume || previousWeekVolume <= 0) return sessions;
	const maxWeeklyVolume = Math.max(1, Math.floor(previousWeekVolume * 1.1));
	const total = computeWeeklyVolume(sessions);
	if (total <= maxWeeklyVolume) return sessions;

	const ratio = maxWeeklyVolume / total;
	const scaled = sessions.map((session) => {
		if (session.isRest || session.exercises.length === 0) return session;
		const maxForSession = Math.max(
			session.exercises.length,
			Math.floor(computeSessionVolume(session.exercises) * ratio),
		);
		const exercises = scaleExercisesToVolumeRange(
			session.exercises,
			0,
			maxForSession,
		);
		return {
			...session,
			baselineVolume: computeSessionVolume(exercises),
			exercises,
		};
	});

	// Trim any rounding excess so total strictly satisfies <= maxWeeklyVolume.
	let safety = 0;
	while (computeWeeklyVolume(scaled) > maxWeeklyVolume && safety < 100) {
		safety++;
		const heaviest = scaled
			.filter((s) => !s.isRest && s.exercises.length > 0)
			.sort(
				(a, b) =>
					computeSessionVolume(b.exercises) - computeSessionVolume(a.exercises),
			)[0];
		if (!heaviest) break;
		const before = computeSessionVolume(heaviest.exercises);
		const nextExercises = scaleExercisesToVolumeRange(
			heaviest.exercises,
			0,
			Math.max(1, before - 1),
		);
		if (computeSessionVolume(nextExercises) >= before) break;
		heaviest.exercises = nextExercises;
		heaviest.baselineVolume = computeSessionVolume(nextExercises);
	}

	return scaled;
}

export function buildFallbackWeeklyPlan(params: {
	profile: PlanProfileInput;
	eligibleExercises: readonly PlanExerciseMeta[];
	allExercises: readonly PlanExerciseMeta[];
	previousWeekExerciseIds?: ReadonlySet<string>;
	previousWeekVolume?: number | null;
}): SafeWeeklyPlan {
	const {
		profile,
		eligibleExercises,
		allExercises,
		previousWeekExerciseIds = new Set<string>(),
		previousWeekVolume,
	} = params;
	const trainingSet = new Set(profile.trainingDays);
	let rotationIdx = 0;

	const sessions: SafePlannedSession[] = ORDERED_WEEK_DAYS.map((dayOfWeek) => {
		if (!trainingSet.has(dayOfWeek)) {
			return {
				dayOfWeek,
				focus: "Rest & Recovery",
				notes: "Light walking or gentle mobility if desired.",
				isRest: true,
				baselineVolume: 0,
				exercises: [],
			};
		}

		const built = buildRuleBasedSessionExercises({
			rotationIndex: rotationIdx++,
			sessionMinutes: profile.sessionMinutes,
			experienceLevel: profile.experienceLevel,
			goals: profile.goals,
			eligibleExercises,
			allExercises,
			previousWeekExerciseIds,
		});
		return {
			dayOfWeek,
			focus: built.focus,
			notes: null,
			isRest: false,
			baselineVolume: computeSessionVolume(built.exercises),
			exercises: built.exercises,
		};
	});

	return {
		notes:
			"Structured calisthenics schedule tailored to your equipment and level.",
		sessions: capWeeklyVolume(sessions, previousWeekVolume),
	};
}

function clampText(
	value: string | null | undefined,
	maxLen: number,
	fallback: string,
): string {
	const trimmed = value?.trim() ?? "";
	if (!trimmed) return fallback;
	return trimmed.length > maxLen ? trimmed.slice(0, maxLen).trimEnd() : trimmed;
}

function clampOptionalText(
	value: string | null | undefined,
	maxLen: number,
): string | null {
	const trimmed = value?.trim() ?? "";
	if (!trimmed) return null;
	return trimmed.length > maxLen ? trimmed.slice(0, maxLen).trimEnd() : trimmed;
}

export function enforceWeeklySafetyBounds(params: {
	aiPlan: WeeklyPlanAi;
	profile: PlanProfileInput;
	eligibleExercises: readonly PlanExerciseMeta[];
	allExercises: readonly PlanExerciseMeta[];
	previousWeekExerciseIds?: ReadonlySet<string>;
	previousWeekVolume?: number | null;
}): SafeWeeklyPlan {
	const {
		aiPlan,
		profile,
		eligibleExercises,
		allExercises,
		previousWeekExerciseIds = new Set<string>(),
		previousWeekVolume,
	} = params;

	const eligibleById = new Map(eligibleExercises.map((ex) => [ex.id, ex]));
	const eligibleIds = new Set(eligibleById.keys());
	const aiByDay = new Map(aiPlan.sessions.map((s) => [s.dayOfWeek, s]));
	const trainingSet = new Set(profile.trainingDays);
	let fallbackIdx = 0;

	const sessions: SafePlannedSession[] = ORDERED_WEEK_DAYS.map((dayOfWeek) => {
		if (!trainingSet.has(dayOfWeek)) {
			return {
				dayOfWeek,
				focus: "Rest & Recovery",
				notes: "Scheduled rest day.",
				isRest: true,
				baselineVolume: 0,
				exercises: [],
			};
		}

		const aiSession = aiByDay.get(dayOfWeek);
		const seenIds = new Set<string>();
		const validExercises: NormalizedPlannedExercise[] = [];

		for (const rawEx of aiSession?.exercises ?? []) {
			if (validExercises.length >= 8) break;
			if (!eligibleIds.has(rawEx.exerciseId)) continue;
			const safeId = clampProgressionStep(
				rawEx.exerciseId,
				allExercises,
				eligibleIds,
				previousWeekExerciseIds,
			);
			const meta = eligibleById.get(safeId);
			if (!meta || seenIds.has(safeId)) continue;
			seenIds.add(safeId);
			validExercises.push(
				normalizePlannedExercise({ ...rawEx, exerciseId: safeId }, meta),
			);
		}

		if (validExercises.length === 0) {
			const built = buildRuleBasedSessionExercises({
				rotationIndex: fallbackIdx++,
				sessionMinutes: profile.sessionMinutes,
				experienceLevel: profile.experienceLevel,
				goals: profile.goals,
				eligibleExercises,
				allExercises,
				previousWeekExerciseIds,
			});
			return {
				dayOfWeek,
				focus: clampText(aiSession?.focus, 80, built.focus),
				notes: clampOptionalText(aiSession?.notes, 240),
				isRest: false,
				baselineVolume: computeSessionVolume(built.exercises),
				exercises: built.exercises,
			};
		}

		return {
			dayOfWeek,
			focus: clampText(aiSession?.focus, 80, "Calisthenics Session"),
			notes: clampOptionalText(aiSession?.notes, 240),
			isRest: false,
			baselineVolume: computeSessionVolume(validExercises),
			exercises: validExercises,
		};
	});

	return {
		notes: clampText(
			aiPlan.notes,
			400,
			"Structured calisthenics schedule tailored to your equipment and level.",
		),
		sessions: capWeeklyVolume(sessions, previousWeekVolume),
	};
}

export function enforceDailyAdjustmentBounds(params: {
	plannedExercises: readonly NormalizedPlannedExercise[];
	candidate: AdjustedSessionAi;
	eligibleExercises: readonly PlanExerciseMeta[];
	painAreas: readonly string[];
	baselineVolume: number;
}): {
	focus: string;
	notes: string;
	exercises: NormalizedPlannedExercise[];
} {
	const {
		plannedExercises,
		candidate,
		eligibleExercises,
		painAreas,
		baselineVolume,
	} = params;
	const painSet = new Set(painAreas);

	const painSafeEligible = eligibleExercises.filter(
		(ex) => !ex.contraindications.some((area) => painSet.has(area)),
	);
	const painSafeById = new Map(painSafeEligible.map((ex) => [ex.id, ex]));
	const eligibleById = new Map(eligibleExercises.map((ex) => [ex.id, ex]));

	const seen = new Set<string>();
	const safeExercises: NormalizedPlannedExercise[] = [];

	for (const raw of candidate.exercises) {
		if (safeExercises.length >= 8) break;
		const meta = painSafeById.get(raw.exerciseId);
		if (!meta || seen.has(meta.id)) continue;
		seen.add(meta.id);
		safeExercises.push(normalizePlannedExercise(raw, meta));
	}

	// Fall back to pain-safe movements from the original planned session.
	if (safeExercises.length === 0) {
		for (const planned of plannedExercises) {
			const meta = painSafeById.get(planned.exerciseId);
			if (meta && !seen.has(meta.id)) {
				seen.add(meta.id);
				safeExercises.push({ ...planned });
			}
		}
	}

	// If all original movements had pain contraindications, pull up to 3 safe eligible exercises.
	if (safeExercises.length === 0) {
		for (const safe of painSafeEligible.slice(0, 3)) {
			safeExercises.push(
				normalizePlannedExercise(
					{
						exerciseId: safe.id,
						sets: 2,
						targetReps: safe.measure === "REPS" ? 8 : null,
						targetSeconds: safe.measure === "SECONDS" ? 25 : null,
						restSeconds: 60,
					},
					safe,
				),
			);
		}
	}

	// Last resort if the user has injuries matching every exercise in library.
	if (safeExercises.length === 0) {
		for (const planned of plannedExercises) {
			if (eligibleById.has(planned.exerciseId)) {
				safeExercises.push({ ...planned });
			}
		}
	}

	const maxVolume = Math.max(1, Math.floor(baselineVolume * 1.15));
	const minVolume = Math.min(maxVolume, Math.ceil(baselineVolume * 0.6));
	const clamped =
		baselineVolume > 0
			? scaleExercisesToVolumeRange(safeExercises, minVolume, maxVolume)
			: safeExercises;

	return {
		focus: clampText(candidate.focus, 80, "Adjusted Session"),
		notes: clampText(
			candidate.notes,
			300,
			"Adjusted based on today's check-in.",
		),
		exercises: clamped,
	};
}
