import "server-only";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { db } from "@/lib/db";
import "@/lib/env";
import {
	buildFallbackWeeklyPlan,
	computeWeeklyVolume,
	enforceWeeklySafetyBounds,
	type PlanExerciseMeta,
} from "@/lib/ai/plan-safety";
import { WeeklyPlanAiSchema } from "@/lib/ai/plan-schema";
import { filterEligibleExercises } from "@/lib/exercises/eligibility";
import { assertCanGeneratePlan } from "@/server/services/plan-gate";

const AI_MODEL_ID = "gemini-2.5-flash";

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
									contraindications: true,
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
): Promise<GeneratePlanResult> {
	const profile = await db.profile.findUnique({ where: { userId } });
	assertCanGeneratePlan(profile);
	if (!profile) throw new Error("Profile missing");

	const dateKey = getLocalDateKey(profile.timezone);
	const weekStart = getWeekStartUtc(dateKey);

	const existing = await db.weeklyPlan.findUnique({
		where: { userId_weekStart: { userId, weekStart } },
		select: { id: true, fallbackUsed: true },
	});
	if (existing) {
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

	const prompt = [
		"You are an expert calisthenics coach creating a 7-day weekly plan.",
		`User level: ${profile.experienceLevel}`,
		`Goals: ${profile.goals.join(", ")}`,
		`Training days (0=Sun..6=Sat): ${profile.trainingDays.join(", ")}`,
		`Session length: ${profile.sessionMinutes} minutes`,
		profile.injuries.length > 0
			? `Injuries to avoid: ${profile.injuries.join(", ")}`
			: "No reported injuries.",
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
	].join("\n");

	let fallbackUsed = false;
	let tokens = 0;
	let rawJson: object | undefined;
	let safePlan: ReturnType<typeof enforceWeeklySafetyBounds>;

	try {
		const response = await generateObject({
			model: google(AI_MODEL_ID),
			schema: WeeklyPlanAiSchema,
			prompt,
			maxRetries: 1,
			abortSignal: AbortSignal.timeout(15_000),
		});
		tokens = response.usage?.totalTokens ?? 0;
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
	} catch {
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
				aiModel: fallbackUsed ? "rule-based-fallback" : AI_MODEL_ID,
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

export async function getCurrentPlanPageData(
	userId: string,
	timezone?: string,
) {
	const todayKey = getLocalDateKey(timezone);
	const todayDayOfWeek = new Date(`${todayKey}T00:00:00.000Z`).getUTCDay();

	const [plan, allExercises] = await Promise.all([
		getCurrentWeeklyPlan(userId, timezone),
		db.exercise.findMany({
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
				contraindications: true,
				progressionNextId: true,
				status: true,
				source: true,
				sourceUrl: true,
				license: true,
			},
		}),
	]);

	return { todayKey, todayDayOfWeek, plan, allExercises };
}
