import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import "@/lib/env";
import {
	buildFallbackWeeklyPlan,
	computeWeeklyVolume,
	enforceWeeklySafetyBounds,
	type PlanExerciseMeta,
} from "@/lib/ai/plan-safety";
import { WeeklyPlanAiWireSchema } from "@/lib/ai/plan-schema";
import { filterEligibleExercises } from "@/lib/exercises/eligibility";
import {
	buildWeeklyWellnessTrendContext,
	buildWellnessAiContext,
	computeDetailedCyclePhaseForDate,
	parsePainDetailsRecord,
} from "@/lib/wellness/cycle-and-wellness";
import { generateStructuredWithFallback } from "@/server/services/ai-client";
import { assertCanGeneratePlan } from "@/server/services/plan-gate";

export function getLocalDateKey(
	timezone = "Asia/Jakarta",
	now = new Date(),
): string {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(now);
}

/** Returns Monday 00:00:00.000Z of the week containing `dateKey` (YYYY-MM-DD). */
export function getWeekStartUtc(dateKey: string): Date {
	const date = new Date(`${dateKey}T00:00:00.000Z`);
	const day = date.getUTCDay(); // 0=Sun..6=Sat
	const diffToMonday = day === 0 ? -6 : 1 - day;
	date.setUTCDate(date.getUTCDate() + diffToMonday);
	return date;
}

export function getDateForDayOfWeek(weekStart: Date, dayOfWeek: number): Date {
	const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
	const date = new Date(weekStart);
	date.setUTCDate(date.getUTCDate() + offset);
	return date;
}

export async function getCurrentWeeklyPlan(userId: string, timezone?: string) {
	const dateKey = getLocalDateKey(timezone);
	const weekStart = getWeekStartUtc(dateKey);

	return db.weeklyPlan.findUnique({
		where: { userId_weekStart: { userId, weekStart } },
		include: {
			sessions: {
				orderBy: { date: "asc" },
				include: {
					dailyCheckin: true,
					exercises: {
						orderBy: { order: "asc" },
						include: {
							exercise: {
								select: {
									id: true,
									slug: true,
									name: true,
									pattern: true,
									difficulty: true,
									equipment: true,
									measure: true,
									cues: true,
									demoVideoId: true,
									demoImages: true,
									contraindications: true,
									primaryMuscles: true,
									secondaryMuscles: true,
									muscles: {
										select: {
											muscleGroup: true,
											role: true,
											activationWeight: true,
										},
										orderBy: { activationWeight: "desc" },
									},
									masteryTargetSets: true,
									masteryTargetReps: true,
									masteryTargetSeconds: true,
									progressionNextId: true,
									status: true,
									source: true,
									sourceUrl: true,
									license: true,
								},
							},
						},
					},
				},
			},
		},
	});
}

export type GeneratePlanResult =
	| { ok: true; planId: string; fallbackUsed: boolean }
	| { ok: false; reason: "no_eligible_exercises" };

export async function generateWeeklyPlanForUser(
	userId: string,
	options?: { forceRegenerateFallback?: boolean },
): Promise<GeneratePlanResult> {
	const profile = await db.profile.findUnique({ where: { userId } });
	assertCanGeneratePlan(profile);
	if (!profile) throw new Error("Profile missing");

	const dateKey = getLocalDateKey(profile.timezone);
	const weekStart = getWeekStartUtc(dateKey);

	const existing = await db.weeklyPlan.findUnique({
		where: { userId_weekStart: { userId, weekStart } },
		select: {
			id: true,
			fallbackUsed: true,
			sessions: {
				select: {
					id: true,
					dayOfWeek: true,
					dailyCheckin: { select: { id: true } },
					workoutLogs: { select: { id: true }, take: 1 },
				},
			},
		},
	});
	const canRegenerateFallback = Boolean(
		existing?.fallbackUsed && options?.forceRegenerateFallback,
	);
	if (existing && !canRegenerateFallback) {
		return {
			ok: true,
			planId: existing.id,
			fallbackUsed: existing.fallbackUsed,
		};
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

	if (eligibleExercises.length === 0) {
		return { ok: false, reason: "no_eligible_exercises" };
	}

	const previousPlan = await db.weeklyPlan.findFirst({
		where: { userId, weekStart: { lt: weekStart } },
		orderBy: { weekStart: "desc" },
		include: {
			sessions: {
				include: { exercises: true },
			},
		},
	});

	const previousWeekExerciseIds = new Set<string>();
	let previousWeekVolume = 0;
	if (previousPlan) {
		for (const session of previousPlan.sessions) {
			for (const ex of session.exercises) {
				previousWeekExerciseIds.add(ex.exerciseId);
			}
		}
		previousWeekVolume = computeWeeklyVolume(previousPlan.sessions);
	}

	const [recentWellnessRows, recentCycles] = await Promise.all([
		db.dailyWellnessLog.findMany({
			where: { userId },
			orderBy: { date: "desc" },
			take: 7,
			select: {
				date: true,
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

	const recentWellness = recentWellnessRows.map((row) => ({
		...row,
		painDetails: parsePainDetailsRecord(row.painDetails),
	}));

	const cyclePhaseLines: string[] = [];
	if (
		profile.tracksPeriod &&
		(profile.lastPeriodStartDate || recentCycles.length > 0)
	) {
		for (const dayOfWeek of profile.trainingDays) {
			const dayDate = getDateForDayOfWeek(weekStart, dayOfWeek)
				.toISOString()
				.slice(0, 10);
			const info = computeDetailedCyclePhaseForDate({
				tracksPeriod: profile.tracksPeriod,
				lastPeriodStartDate: profile.lastPeriodStartDate,
				averageCycleDays: profile.averageCycleDays,
				averagePeriodDays: profile.averagePeriodDays,
				lutealPhaseDays: profile.lutealPhaseDays,
				cycleRegularity: profile.cycleRegularity,
				cycles: recentCycles,
				targetDateKey: dayDate,
			});
			if (info) {
				cyclePhaseLines.push(
					`dayOfWeek=${dayOfWeek} (${dayDate}): ${info.phase} (cycle day ${info.dayInCycle})`,
				);
			}
		}
	}

	const latestWellnessContext = buildWellnessAiContext({
		cyclePhase: computeDetailedCyclePhaseForDate({
			tracksPeriod: profile.tracksPeriod,
			lastPeriodStartDate: profile.lastPeriodStartDate,
			averageCycleDays: profile.averageCycleDays,
			averagePeriodDays: profile.averagePeriodDays,
			lutealPhaseDays: profile.lutealPhaseDays,
			cycleRegularity: profile.cycleRegularity,
			cycles: recentCycles,
			targetDateKey: dateKey,
		}),
		cycleRegularity: profile.cycleRegularity,
		log: recentWellness[0] ?? null,
	});
	const weeklyTrendContext = buildWeeklyWellnessTrendContext(recentWellness);

	const prompt = [
		"You are an expert calisthenics coach creating a 7-day weekly plan.",
		`User level: ${profile.experienceLevel}`,
		`Goals: ${profile.goals.join(", ")}`,
		`Training days (0=Sun..6=Sat): ${profile.trainingDays.join(", ")}`,
		`Session length: ${profile.sessionMinutes} minutes`,
		profile.injuries.length > 0
			? `Injuries to avoid: ${profile.injuries.join(", ")}`
			: "No reported injuries.",
		cyclePhaseLines.length > 0
			? `Cycle schedule (adapt volume conservatively on menstrual days, no medical claims):\n${cyclePhaseLines.join("\n")}`
			: "",
		latestWellnessContext
			? `Recent wellness context (non-medical load adaptation):\n${latestWellnessContext}`
			: "",
		weeklyTrendContext
			? `7-day wellness trend (non-medical recovery cues):\n${weeklyTrendContext}`
			: "",
		previousWeekVolume > 0
			? `Previous week total volume: ${previousWeekVolume}. Keep weekly progression gradual (<= +10% volume, <= 1 progression step).`
			: "This is the user's first week; start conservatively.",
		"",
		"Rules:",
		"- Return sessions ONLY for the user's trainingDays; each session must have 3-6 exercises.",
		"- ONLY use exerciseId values from the Eligible Exercises JSON list below.",
		"- Match targetReps for REPS exercises and targetSeconds for SECONDS exercises.",
		"- Never make medical claims.",
		"",
		"Eligible Exercises:",
		JSON.stringify(
			eligibleExercises.map((e) => ({
				id: e.id,
				name: e.name,
				pattern: e.pattern,
				difficulty: e.difficulty,
				measure: e.measure,
			})),
		),
	]
		.filter(Boolean)
		.join("\n");

	let fallbackUsed = false;
	let usedModelId = "rule-based-fallback";
	let tokens = 0;
	let rawJson: object | undefined;
	let safePlan: ReturnType<typeof enforceWeeklySafetyBounds>;

	try {
		const response = await generateStructuredWithFallback({
			schema: WeeklyPlanAiWireSchema,
			prompt,
			label: "weekly-plan",
		});
		tokens = response.tokens;
		usedModelId = response.modelId;
		rawJson = response.object;
		safePlan = enforceWeeklySafetyBounds({
			aiPlan: response.object,
			profile: {
				experienceLevel: profile.experienceLevel,
				trainingDays: profile.trainingDays,
				sessionMinutes: profile.sessionMinutes,
				goals: profile.goals,
			},
			eligibleExercises,
			allExercises,
			previousWeekExerciseIds,
			previousWeekVolume,
		});
	} catch (error) {
		console.error(
			"[ai:weekly-plan] all AI models failed, using rule-based fallback:",
			error,
		);
		fallbackUsed = true;
		safePlan = buildFallbackWeeklyPlan({
			profile: {
				experienceLevel: profile.experienceLevel,
				trainingDays: profile.trainingDays,
				sessionMinutes: profile.sessionMinutes,
				goals: profile.goals,
			},
			eligibleExercises,
			allExercises,
			previousWeekExerciseIds,
			previousWeekVolume,
		});
	}

	if (existing && canRegenerateFallback) {
		if (fallbackUsed) {
			await db.aiUsage.create({
				data: {
					userId,
					kind: "WEEKLY",
					date: dateKey,
					tokens,
					success: false,
				},
			});
			return { ok: true, planId: existing.id, fallbackUsed: true };
		}

		const existingByDay = new Map(
			existing.sessions.map((s) => [s.dayOfWeek, s]),
		);

		await db.$transaction(async (tx) => {
			await tx.weeklyPlan.update({
				where: { id: existing.id },
				data: {
					aiModel: usedModelId,
					notes: safePlan.notes,
					rawJson,
					fallbackUsed: false,
				},
			});

			for (const session of safePlan.sessions) {
				const prev = existingByDay.get(session.dayOfWeek);
				// Preserve any session the user already checked into or logged sets for.
				if (prev && (prev.dailyCheckin || prev.workoutLogs.length > 0)) {
					continue;
				}

				if (prev) {
					await tx.plannedExercise.deleteMany({
						where: { plannedSessionId: prev.id },
					});
					await tx.plannedSession.update({
						where: { id: prev.id },
						data: {
							date: getDateForDayOfWeek(weekStart, session.dayOfWeek),
							focus: session.focus,
							notes: session.notes,
							isRest: session.isRest,
							baselineVolume: session.baselineVolume,
							exercises: {
								create: session.exercises.map((ex, index) => ({
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
				} else {
					await tx.plannedSession.create({
						data: {
							weeklyPlanId: existing.id,
							dayOfWeek: session.dayOfWeek,
							date: getDateForDayOfWeek(weekStart, session.dayOfWeek),
							focus: session.focus,
							notes: session.notes,
							isRest: session.isRest,
							baselineVolume: session.baselineVolume,
							exercises: {
								create: session.exercises.map((ex, index) => ({
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
				}
			}

			await tx.aiUsage.create({
				data: {
					userId,
					kind: "WEEKLY",
					date: dateKey,
					tokens,
					success: true,
				},
			});
		});

		return { ok: true, planId: existing.id, fallbackUsed: false };
	}

	const created = await db.$transaction(async (tx) => {
		await tx.weeklyPlan.updateMany({
			where: { userId, status: "ACTIVE" },
			data: { status: "ARCHIVED" },
		});

		const plan = await tx.weeklyPlan.create({
			data: {
				userId,
				weekStart,
				status: "ACTIVE",
				aiModel: fallbackUsed ? "rule-based-fallback" : usedModelId,
				notes: safePlan.notes,
				rawJson,
				fallbackUsed,
				sessions: {
					create: safePlan.sessions.map((session) => ({
						dayOfWeek: session.dayOfWeek,
						date: getDateForDayOfWeek(weekStart, session.dayOfWeek),
						focus: session.focus,
						notes: session.notes,
						isRest: session.isRest,
						baselineVolume: session.baselineVolume,
						exercises: {
							create: session.exercises.map((ex, index) => ({
								exerciseId: ex.exerciseId,
								order: index,
								sets: ex.sets,
								targetReps: ex.targetReps,
								targetSeconds: ex.targetSeconds,
								restSeconds: ex.restSeconds,
							})),
						},
					})),
				},
			},
			select: { id: true },
		});

		await tx.aiUsage.create({
			data: {
				userId,
				kind: "WEEKLY",
				date: dateKey,
				tokens,
				success: !fallbackUsed,
			},
		});

		return plan;
	});

	return { ok: true, planId: created.id, fallbackUsed };
}

export async function getCachedExerciseCatalog() {
	"use cache";
	cacheLife("hours");
	cacheTag("exercises-catalog");

	return db.exercise.findMany({
		orderBy: [{ pattern: "asc" }, { difficulty: "asc" }, { name: "asc" }],
		select: {
			id: true,
			slug: true,
			name: true,
			pattern: true,
			difficulty: true,
			equipment: true,
			measure: true,
			cues: true,
			demoVideoId: true,
			demoImages: true,
			contraindications: true,
			primaryMuscles: true,
			secondaryMuscles: true,
			muscles: {
				select: {
					muscleGroup: true,
					role: true,
					activationWeight: true,
				},
				orderBy: { activationWeight: "desc" },
			},
			masteryTargetSets: true,
			masteryTargetReps: true,
			masteryTargetSeconds: true,
			progressionNextId: true,
			status: true,
			source: true,
			sourceUrl: true,
			license: true,
		},
	});
}

export async function getCurrentPlanPageData(
	userId: string,
	timezone?: string,
) {
	const todayKey = getLocalDateKey(timezone);
	const todayDayOfWeek = new Date(`${todayKey}T00:00:00.000Z`).getUTCDay();

	const [plan, allExercises] = await Promise.all([
		getCurrentWeeklyPlan(userId, timezone),
		getCachedExerciseCatalog(),
	]);

	return { todayKey, todayDayOfWeek, plan, allExercises };
}
