import "server-only";
import {
	computeSessionVolume,
	enforceDailyAdjustmentBounds,
	type NormalizedPlannedExercise,
	type PlanExerciseMeta,
} from "@/lib/ai/plan-safety";
import {
	AdjustedSessionAiWireSchema,
	type DailyCheckinInput,
	DailyCheckinInputSchema,
} from "@/lib/ai/plan-schema";
import { db } from "@/lib/db";
import "@/lib/env";
import { filterEligibleExercises } from "@/lib/exercises/eligibility";
import {
	buildWellnessAiContext,
	computeDetailedCyclePhaseForDate,
	mapWellnessPainTagsToInjuryAreas,
	parsePainDetailsRecord,
} from "@/lib/wellness/cycle-and-wellness";
import { generateStructuredWithFallback } from "@/server/services/ai-client";
import { assertCanGeneratePlan } from "@/server/services/plan-gate";
import { getLocalDateKey } from "@/server/services/weekly-plan-service";

export type CheckinResult =
	| { ok: true; fallbackUsed: boolean; aiNote: string | null }
	| {
			ok: false;
			reason: "invalid" | "not_found" | "rest_day" | "already_checked_in";
	  };

export async function submitDailyCheckinAndAdjust(params: {
	userId: string;
	input: DailyCheckinInput;
}): Promise<CheckinResult> {
	const parsed = DailyCheckinInputSchema.safeParse(params.input);
	if (!parsed.success) {
		return { ok: false, reason: "invalid" };
	}

	const { userId } = params;
	const data = parsed.data;
	const profile = await db.profile.findUnique({ where: { userId } });
	assertCanGeneratePlan(profile);
	if (!profile) throw new Error("Profile missing");

	const session = await db.plannedSession.findUnique({
		where: { id: data.sessionId },
		include: {
			weeklyPlan: { select: { userId: true } },
			dailyCheckin: { select: { id: true } },
			exercises: {
				orderBy: { order: "asc" },
				include: {
					exercise: { select: { id: true, name: true } },
				},
			},
		},
	});

	if (!session || session.weeklyPlan.userId !== userId) {
		return { ok: false, reason: "not_found" };
	}
	if (session.isRest) {
		return { ok: false, reason: "rest_day" };
	}

	const todayKey = getLocalDateKey(profile.timezone);
	const existingToday = await db.dailyCheckin.findUnique({
		where: { userId_date: { userId, date: todayKey } },
		select: { id: true },
	});
	if (session.dailyCheckin || existingToday) {
		return { ok: false, reason: "already_checked_in" };
	}

	const allExercises = await db.exercise.findMany({
		select: {
			id: true,
			name: true,
			pattern: true,
			difficulty: true,
			equipment: true,
			measure: true,
			contraindications: true,
			status: true,
			progressionNextId: true,
		},
	});

	const eligibleExercises: PlanExerciseMeta[] = filterEligibleExercises(
		allExercises,
		{
			experienceLevel: profile.experienceLevel,
			equipment: profile.equipment,
			injuries: profile.injuries,
		},
	);

	const [todayWellnessRow, recentCycles] = await Promise.all([
		db.dailyWellnessLog.findUnique({
			where: { userId_date: { userId, date: todayKey } },
			select: {
				periodFlow: true,
				painTags: true,
				painSeverity: true,
				painDetails: true,
				crampSeverity: true,
				medications: true,
				supplements: true,
				sleepDurationMinutes: true,
				sleepQuality: true,
				energyLevel: true,
				stressLevel: true,
				moodTags: true,
				hydrationMl: true,
			},
		}),
		profile.tracksPeriod
			? db.menstrualCycle.findMany({
					where: { userId },
					orderBy: { startDate: "desc" },
					take: 6,
					select: {
						startDate: true,
						endDate: true,
						cycleLengthDays: true,
						periodLengthDays: true,
						isConfirmed: true,
					},
				})
			: Promise.resolve([]),
	]);

	const todayWellness = todayWellnessRow
		? {
				...todayWellnessRow,
				painDetails: parsePainDetailsRecord(todayWellnessRow.painDetails),
			}
		: null;

	const painSet = new Set<string>([
		...data.painAreas,
		...mapWellnessPainTagsToInjuryAreas(todayWellness?.painTags ?? []),
	]);
	const painSafeEligible = eligibleExercises.filter(
		(ex) => !ex.contraindications.some((area) => painSet.has(area)),
	);

	const wellnessContext = buildWellnessAiContext({
		cyclePhase: computeDetailedCyclePhaseForDate({
			tracksPeriod: profile.tracksPeriod,
			lastPeriodStartDate: profile.lastPeriodStartDate,
			averageCycleDays: profile.averageCycleDays,
			averagePeriodDays: profile.averagePeriodDays,
			lutealPhaseDays: profile.lutealPhaseDays,
			cycleRegularity: profile.cycleRegularity,
			cycles: recentCycles,
			targetDateKey: todayKey,
			hasLoggedPeriodFlowOnDate: Boolean(todayWellness?.periodFlow),
		}),
		cycleRegularity: profile.cycleRegularity,
		log: todayWellness,
	});

	const plannedNormalized: NormalizedPlannedExercise[] = session.exercises.map(
		(ex) => ({
			exerciseId: ex.exerciseId,
			sets: ex.sets,
			targetReps: ex.targetReps,
			targetSeconds: ex.targetSeconds,
			restSeconds: ex.restSeconds,
		}),
	);

	const baselineVolume =
		session.baselineVolume > 0
			? session.baselineVolume
			: computeSessionVolume(plannedNormalized);

	const prompt = [
		"You are adjusting today's calisthenics workout based on the user's pre-workout check-in.",
		`Planned focus: ${session.focus}`,
		`Check-in: energy=${data.energy}/5, soreness=${data.soreness}/5, availableMinutes=${data.minutesAvailable}`,
		painSet.size > 0
			? `Current pain/avoid areas (MUST avoid contraindicated exercises): ${[...painSet].join(", ")}`
			: "No pain reported today.",
		wellnessContext
			? `Today's cycle & wellness log (no medical claims):\n${wellnessContext}`
			: "",
		`Baseline volume: ${baselineVolume} (keep adjusted volume strictly within -40% to +15%).`,
		"",
		"Current planned exercises:",
		JSON.stringify(
			session.exercises.map((e) => ({
				exerciseId: e.exerciseId,
				name: e.exercise.name,
				sets: e.sets,
				targetReps: e.targetReps,
				targetSeconds: e.targetSeconds,
				restSeconds: e.restSeconds,
			})),
		),
		"",
		"Pain-safe eligible exercise pool (ONLY pick exerciseId from here):",
		JSON.stringify(
			painSafeEligible.map((e) => ({
				id: e.id,
				name: e.name,
				pattern: e.pattern,
				difficulty: e.difficulty,
				measure: e.measure,
			})),
		),
	].join("\n");

	let tokens = 0;

	try {
		const response = await generateStructuredWithFallback({
			schema: AdjustedSessionAiWireSchema,
			prompt,
			label: "daily-checkin",
		});
		tokens = response.tokens;

		const safe = enforceDailyAdjustmentBounds({
			plannedExercises: plannedNormalized,
			candidate: response.object,
			eligibleExercises,
			painAreas: [...painSet],
			baselineVolume,
		});

		await db.$transaction(async (tx) => {
			await tx.plannedExercise.deleteMany({
				where: { plannedSessionId: session.id },
			});
			await tx.plannedSession.update({
				where: { id: session.id },
				data: {
					focus: safe.focus,
					notes: safe.notes,
					isAdjusted: true,
					exercises: {
						create: safe.exercises.map((ex, index) => ({
							exerciseId: ex.exerciseId,
							order: index,
							sets: ex.sets,
							targetReps: ex.targetReps,
							targetSeconds: ex.targetSeconds,
							restSeconds: ex.restSeconds,
						})),
					},
				},
			});
			await tx.dailyCheckin.create({
				data: {
					userId,
					plannedSessionId: session.id,
					date: todayKey,
					energy: data.energy,
					soreness: data.soreness,
					painAreas: data.painAreas,
					minutesAvailable: data.minutesAvailable,
					aiNote: safe.notes,
					fallbackUsed: false,
				},
			});
			await tx.aiUsage.create({
				data: {
					userId,
					kind: "DAILY",
					date: todayKey,
					tokens,
					success: true,
				},
			});
		});

		return { ok: true, fallbackUsed: false, aiNote: safe.notes };
	} catch (error) {
		console.error(
			"[ai:daily-checkin] all AI models failed, keeping planned session unchanged:",
			error,
		);
		// On AI failure or timeout, leave planned session unchanged per PRD.
		await db.$transaction([
			db.dailyCheckin.create({
				data: {
					userId,
					plannedSessionId: session.id,
					date: todayKey,
					energy: data.energy,
					soreness: data.soreness,
					painAreas: data.painAreas,
					minutesAvailable: data.minutesAvailable,
					aiNote: null,
					fallbackUsed: true,
				},
			}),
			db.aiUsage.create({
				data: {
					userId,
					kind: "DAILY",
					date: todayKey,
					tokens,
					success: false,
				},
			}),
		]);

		return { ok: true, fallbackUsed: true, aiNote: null };
	}
}
