import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import {
	computeSessionXp,
	computeStreakBonusXp,
} from "@/lib/gamification/engine";
import { recalculateAndSaveUserStats } from "@/server/services/gamification-service";
import { assertCanGeneratePlan } from "@/server/services/plan-gate";
import { getLocalDateKey } from "@/server/services/weekly-plan-service";

export const LogSetInputSchema = z.object({
	plannedSessionId: z.string().min(1).optional(),
	exerciseId: z.string().min(1),
	setNumber: z.number().int().min(1).max(10),
	reps: z.number().int().min(1).max(100).nullable().optional(),
	seconds: z.number().int().min(5).max(600).nullable().optional(),
});

export type LogSetInput = z.input<typeof LogSetInputSchema>;

export type LogSetResult =
	| {
			ok: true;
			workoutLogId: string;
			sessionCompleted: boolean;
			xpEarned: number;
	  }
	| { ok: false; reason: "invalid" | "not_found" };

export async function finalizeWorkoutSession(
	userId: string,
	workoutLogId: string,
): Promise<
	| { ok: true; xpEarned: number }
	| { ok: false; reason: "not_found" | "no_sets" }
> {
	const log = await db.workoutLog.findUnique({
		where: { id: workoutLogId },
		include: {
			sets: true,
			plannedSession: {
				include: { exercises: { select: { sets: true } } },
			},
		},
	});

	if (!log || log.userId !== userId) {
		return { ok: false, reason: "not_found" };
	}
	if (log.sets.length === 0) {
		return { ok: false, reason: "no_sets" };
	}

	const plannedSetsCount =
		log.plannedSession?.exercises.reduce((sum, ex) => sum + ex.sets, 0) ??
		log.sets.length;
	const sessionXp = computeSessionXp(log.sets.length, plannedSetsCount);
	const now = new Date();
	const durationSeconds = Math.max(
		1,
		Math.round((now.getTime() - log.startedAt.getTime()) / 1000),
	);

	await db.$transaction(async (tx) => {
		if (!log.completedAt) {
			await tx.workoutLog.update({
				where: { id: log.id },
				data: { completedAt: now, durationSeconds },
			});
		}

		const mainQuest = await tx.quest.findUnique({
			where: {
				userId_key_date: { userId, key: "daily-main", date: log.date },
			},
		});
		if (mainQuest && mainQuest.status !== "COMPLETED") {
			await tx.quest.update({
				where: { id: mainQuest.id },
				data: { status: "COMPLETED", progress: mainQuest.target },
			});
		}

		await tx.xpEvent.upsert({
			where: {
				userId_source_refId: {
					userId,
					source: "SESSION",
					refId: `session:${log.date}`,
				},
			},
			create: {
				userId,
				source: "SESSION",
				refId: `session:${log.date}`,
				amount: sessionXp,
			},
			update: {},
		});
	});

	const updatedStats = await recalculateAndSaveUserStats(userId);
	const streakBonus = computeStreakBonusXp(updatedStats.currentStreak);

	if (streakBonus > 0) {
		await db.xpEvent.upsert({
			where: {
				userId_source_refId: {
					userId,
					source: "STREAK",
					refId: `streak:${log.date}`,
				},
			},
			create: {
				userId,
				source: "STREAK",
				refId: `streak:${log.date}`,
				amount: streakBonus,
			},
			update: {},
		});
		await recalculateAndSaveUserStats(userId);
	}

	return { ok: true, xpEarned: sessionXp + streakBonus };
}

export async function logExerciseSet(params: {
	userId: string;
	input: LogSetInput;
}): Promise<LogSetResult> {
	const parsed = LogSetInputSchema.safeParse(params.input);
	if (!parsed.success) {
		return { ok: false, reason: "invalid" };
	}

	const { userId } = params;
	const data = parsed.data;

	const profile = await db.profile.findUnique({ where: { userId } });
	assertCanGeneratePlan(profile);
	if (!profile) throw new Error("Profile missing");

	const [exercise, plannedSession] = await Promise.all([
		db.exercise.findUnique({
			where: { id: data.exerciseId },
			select: { id: true },
		}),
		data.plannedSessionId
			? db.plannedSession.findUnique({
					where: { id: data.plannedSessionId },
					include: {
						weeklyPlan: { select: { userId: true } },
						exercises: { select: { sets: true } },
					},
				})
			: Promise.resolve(null),
	]);

	if (!exercise) {
		return { ok: false, reason: "not_found" };
	}
	if (plannedSession && plannedSession.weeklyPlan.userId !== userId) {
		return { ok: false, reason: "not_found" };
	}

	const todayKey = getLocalDateKey(profile.timezone);

	const workoutLog = await db.workoutLog.upsert({
		where: { userId_date: { userId, date: todayKey } },
		create: {
			userId,
			date: todayKey,
			plannedSessionId: plannedSession?.id ?? null,
		},
		update: plannedSession ? { plannedSessionId: plannedSession.id } : {},
	});

	await db.setLog.upsert({
		where: {
			workoutLogId_exerciseId_setNumber: {
				workoutLogId: workoutLog.id,
				exerciseId: data.exerciseId,
				setNumber: data.setNumber,
			},
		},
		create: {
			workoutLogId: workoutLog.id,
			exerciseId: data.exerciseId,
			setNumber: data.setNumber,
			reps: data.reps ?? null,
			seconds: data.seconds ?? null,
		},
		update: {
			reps: data.reps ?? null,
			seconds: data.seconds ?? null,
		},
	});

	const totalSetsLogged = await db.setLog.count({
		where: { workoutLogId: workoutLog.id },
	});
	const plannedSetsCount =
		plannedSession?.exercises.reduce((sum, ex) => sum + ex.sets, 0) ?? 0;

	const mainQuest = await db.quest.findUnique({
		where: {
			userId_key_date: { userId, key: "daily-main", date: todayKey },
		},
	});
	if (mainQuest && mainQuest.status === "PENDING") {
		await db.quest.update({
			where: { id: mainQuest.id },
			data: { progress: Math.min(mainQuest.target, totalSetsLogged) },
		});
	}

	if (plannedSetsCount > 0 && totalSetsLogged >= plannedSetsCount) {
		const finalized = await finalizeWorkoutSession(userId, workoutLog.id);
		return {
			ok: true,
			workoutLogId: workoutLog.id,
			sessionCompleted: true,
			xpEarned: finalized.ok ? finalized.xpEarned : 0,
		};
	}

	return {
		ok: true,
		workoutLogId: workoutLog.id,
		sessionCompleted: Boolean(workoutLog.completedAt),
		xpEarned: 0,
	};
}
