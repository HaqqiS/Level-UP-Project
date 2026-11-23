import "server-only";
import { db } from "@/lib/db";
import {
	ACHIEVEMENT_CATALOG,
	evaluateUnlockedAchievements,
} from "@/lib/gamification/achievements";
import {
	buildDailyQuestTemplates,
	buildWeeklyQuestTemplates,
	evaluateStreakHistory,
	getIsoWeekKey,
	getLevelProgress,
} from "@/lib/gamification/engine";
import { assertCanGeneratePlan } from "@/server/services/plan-gate";
import {
	getCurrentWeeklyPlan,
	getLocalDateKey,
} from "@/server/services/weekly-plan-service";

function addDaysKey(dateKey: string, days: number): string {
	const d = new Date(`${dateKey}T00:00:00.000Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}

export async function recalculateAndSaveUserStats(userId: string) {
	const [profile, xpSum, completedLogs] = await Promise.all([
		db.profile.findUnique({
			where: { userId },
			select: { trainingDays: true, timezone: true, createdAt: true },
		}),
		db.xpEvent.aggregate({
			where: { userId },
			_sum: { amount: true },
		}),
		db.workoutLog.findMany({
			where: { userId, completedAt: { not: null } },
			select: { date: true },
			orderBy: { date: "asc" },
		}),
	]);

	const timezone = profile?.timezone ?? "Asia/Jakarta";
	const todayKey = getLocalDateKey(timezone);
	const startDateKey = profile
		? getLocalDateKey(timezone, profile.createdAt)
		: todayKey;

	const totalXp = xpSum._sum.amount ?? 0;
	const levelProgress = getLevelProgress(totalXp);
	const streak = evaluateStreakHistory({
		scheduledDays: profile?.trainingDays ?? [],
		completedDates: completedLogs.map((l) => l.date),
		startDateKey,
		todayDateKey: todayKey,
	});

	const stats = await db.userStats.upsert({
		where: { userId },
		create: {
			userId,
			totalXp,
			level: levelProgress.level,
			currentStreak: streak.currentStreak,
			longestStreak: streak.longestStreak,
			freezesAvailable: streak.freezesAvailable,
			freezeWeekKey: streak.freezeWeekKey,
			lastActiveDate: streak.lastActiveDate,
		},
		update: {
			totalXp,
			level: levelProgress.level,
			currentStreak: streak.currentStreak,
			longestStreak: streak.longestStreak,
			freezesAvailable: streak.freezesAvailable,
			freezeWeekKey: streak.freezeWeekKey,
			lastActiveDate: streak.lastActiveDate,
		},
	});

	return {
		...stats,
		levelProgress,
		freezeUsedThisWeek: streak.freezeUsedThisWeek,
		lastFrozenDate: streak.lastFrozenDate,
	};
}

async function syncWeeklyQuestsForUser(params: {
	userId: string;
	todayKey: string;
	scheduledDaysCount: number;
	plannedWeeklySets: number;
}) {
	const { userId, todayKey, scheduledDaysCount, plannedWeeklySets } = params;
	const weekKey = getIsoWeekKey(todayKey);
	const weekEndKey = addDaysKey(weekKey, 6);

	const templates = buildWeeklyQuestTemplates({
		scheduledDaysCount,
		plannedWeeklySets,
	});

	await db.quest.createMany({
		data: templates.map((q) => ({
			userId,
			type: "WEEKLY",
			key: q.key,
			title: q.title,
			target: q.target,
			progress: 0,
			status: "PENDING",
			date: weekKey,
			xpReward: q.xpReward,
		})),
		skipDuplicates: true,
	});

	const [completedSessions, setsLogged, checkinsCount, existingWeekly] =
		await Promise.all([
			db.workoutLog.count({
				where: {
					userId,
					date: { gte: weekKey, lte: weekEndKey },
					completedAt: { not: null },
				},
			}),
			db.setLog.count({
				where: {
					workoutLog: {
						userId,
						date: { gte: weekKey, lte: weekEndKey },
					},
				},
			}),
			db.dailyCheckin.count({
				where: {
					userId,
					date: { gte: weekKey, lte: weekEndKey },
				},
			}),
			db.quest.findMany({
				where: { userId, type: "WEEKLY", date: weekKey },
				orderBy: { createdAt: "asc" },
			}),
		]);

	const progressByKey: Record<string, number> = {
		"weekly-sessions": completedSessions,
		"weekly-sets": setsLogged,
		"weekly-checkin": checkinsCount,
	};

	for (const quest of existingWeekly) {
		const rawProgress = progressByKey[quest.key] ?? quest.progress;
		const capped = Math.min(quest.target, rawProgress);
		const newlyCompleted = quest.status === "PENDING" && capped >= quest.target;

		if (newlyCompleted) {
			await db.$transaction([
				db.quest.update({
					where: { id: quest.id },
					data: { progress: quest.target, status: "COMPLETED" },
				}),
				db.xpEvent.upsert({
					where: {
						userId_source_refId: {
							userId,
							source: "QUEST",
							refId: quest.id,
						},
					},
					create: {
						userId,
						source: "QUEST",
						refId: quest.id,
						amount: quest.xpReward,
					},
					update: {},
				}),
			]);
		} else if (quest.status === "PENDING" && capped !== quest.progress) {
			await db.quest.update({
				where: { id: quest.id },
				data: { progress: capped },
			});
		}
	}

	return db.quest.findMany({
		where: { userId, type: "WEEKLY", date: weekKey },
		orderBy: { createdAt: "asc" },
	});
}

export async function syncAchievementsForUser(
	userId: string,
	stats: { level: number; longestStreak: number },
) {
	await db.achievement.createMany({
		data: ACHIEVEMENT_CATALOG.map((a) => ({
			key: a.key,
			title: a.title,
			description: a.description,
			category: a.category,
			xpReward: a.xpReward,
		})),
		skipDuplicates: true,
	});

	const [
		completedSessionsCount,
		completedQuestsCount,
		completedWeeklyQuestsCount,
		totalSetsLogged,
		skillSetsLogged,
		bodyMetricsCount,
		catalogRows,
		userAchievements,
	] = await Promise.all([
		db.workoutLog.count({ where: { userId, completedAt: { not: null } } }),
		db.quest.count({ where: { userId, status: "COMPLETED" } }),
		db.quest.count({
			where: { userId, type: "WEEKLY", status: "COMPLETED" },
		}),
		db.setLog.count({ where: { workoutLog: { userId } } }),
		db.setLog.count({
			where: { workoutLog: { userId }, exercise: { pattern: "SKILL" } },
		}),
		db.bodyMetric.count({ where: { userId } }),
		db.achievement.findMany(),
		db.userAchievement.findMany({
			where: { userId },
			include: { achievement: { select: { key: true } } },
		}),
	]);

	const unlockedSet = new Set(userAchievements.map((ua) => ua.achievement.key));
	const achievementByKey = new Map(catalogRows.map((a) => [a.key, a]));

	const newlyUnlocked = evaluateUnlockedAchievements(
		{
			completedSessionsCount,
			completedQuestsCount,
			completedWeeklyQuestsCount,
			longestStreak: stats.longestStreak,
			totalSetsLogged,
			skillSetsLogged,
			level: stats.level,
			bodyMetricsCount,
		},
		unlockedSet,
	);

	for (const badge of newlyUnlocked) {
		const row = achievementByKey.get(badge.key);
		if (!row) continue;

		await db.$transaction([
			db.userAchievement.upsert({
				where: {
					userId_achievementId: { userId, achievementId: row.id },
				},
				create: { userId, achievementId: row.id },
				update: {},
			}),
			db.xpEvent.upsert({
				where: {
					userId_source_refId: {
						userId,
						source: "BADGE",
						refId: badge.key,
					},
				},
				create: {
					userId,
					source: "BADGE",
					refId: badge.key,
					amount: badge.xpReward,
				},
				update: {},
			}),
		]);
	}

	const finalUnlocked = await db.userAchievement.findMany({
		where: { userId },
		include: { achievement: { select: { key: true } } },
	});
	const unlockedAtByKey = new Map(
		finalUnlocked.map((u) => [u.achievement.key, u.unlockedAt.toISOString()]),
	);

	return {
		newlyUnlockedCount: newlyUnlocked.length,
		achievements: ACHIEVEMENT_CATALOG.map((def) => ({
			key: def.key,
			title: def.title,
			description: def.description,
			category: def.category,
			xpReward: def.xpReward,
			unlockedAt: unlockedAtByKey.get(def.key) ?? null,
		})),
	};
}

export async function ensureTodayQuestsAndStats(userId: string) {
	const profile = await db.profile.findUnique({ where: { userId } });
	assertCanGeneratePlan(profile);
	if (!profile) throw new Error("Profile missing");

	const todayKey = getLocalDateKey(profile.timezone);
	const todayDayOfWeek = new Date(`${todayKey}T00:00:00.000Z`).getUTCDay();

	const [plan, todayLog] = await Promise.all([
		getCurrentWeeklyPlan(userId, profile.timezone),
		db.workoutLog.findUnique({
			where: { userId_date: { userId, date: todayKey } },
			include: {
				sets: {
					orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
				},
			},
		}),
	]);

	const todaySession =
		plan?.sessions.find((s) => s.dayOfWeek === todayDayOfWeek) ?? null;
	const isRestDay = todaySession ? todaySession.isRest : true;
	const plannedSetsCount =
		todaySession && !todaySession.isRest
			? todaySession.exercises.reduce((sum, ex) => sum + ex.sets, 0)
			: 0;

	const templates = buildDailyQuestTemplates({
		dateKey: todayKey,
		isRestDay,
		sessionFocus: todaySession?.focus ?? null,
		plannedSetsCount,
	});

	await db.quest.createMany({
		data: templates.map((q) => ({
			userId,
			type: q.type,
			key: q.key,
			title: q.title,
			target: q.target,
			progress: 0,
			status: "PENDING",
			date: todayKey,
			xpReward: q.xpReward,
		})),
		skipDuplicates: true,
	});

	const mainTemplate = templates[0];
	const existingMain = await db.quest.findUnique({
		where: {
			userId_key_date: { userId, key: mainTemplate.key, date: todayKey },
		},
	});
	if (existingMain && existingMain.status === "PENDING") {
		const setsDone = todayLog?.sets.length ?? 0;
		const nextProgress = Math.min(mainTemplate.target, setsDone);
		if (
			existingMain.target !== mainTemplate.target ||
			existingMain.title !== mainTemplate.title ||
			existingMain.progress !== nextProgress
		) {
			await db.quest.update({
				where: { id: existingMain.id },
				data: {
					title: mainTemplate.title,
					target: mainTemplate.target,
					progress: nextProgress,
				},
			});
		}
	}

	const plannedWeeklySets = plan
		? plan.sessions.reduce(
				(sum, s) => sum + s.exercises.reduce((exSum, ex) => exSum + ex.sets, 0),
				0,
			)
		: profile.trainingDays.length * 9;

	const [quests, weeklyQuests, initialStats] = await Promise.all([
		db.quest.findMany({
			where: { userId, date: todayKey, type: { in: ["DAILY", "SIDE"] } },
			orderBy: [{ type: "asc" }, { createdAt: "asc" }],
		}),
		syncWeeklyQuestsForUser({
			userId,
			todayKey,
			scheduledDaysCount: profile.trainingDays.length,
			plannedWeeklySets,
		}),
		recalculateAndSaveUserStats(userId),
	]);

	const { achievements, newlyUnlockedCount } = await syncAchievementsForUser(
		userId,
		initialStats,
	);
	const stats =
		newlyUnlockedCount > 0
			? await recalculateAndSaveUserStats(userId)
			: initialStats;

	return {
		todayKey,
		todayDayOfWeek,
		plan,
		todaySession,
		todayLog,
		quests,
		weeklyQuests,
		achievements,
		stats,
	};
}

export async function getAchievementsForUser(userId: string) {
	const stats = await recalculateAndSaveUserStats(userId);
	const { achievements } = await syncAchievementsForUser(userId, stats);
	return { stats, achievements };
}

export type CompleteQuestResult =
	| { ok: true; xpAwarded: number }
	| { ok: false; reason: "not_found" | "already_completed" };

export async function completeSideQuest(params: {
	userId: string;
	questId: string;
}): Promise<CompleteQuestResult> {
	const quest = await db.quest.findUnique({
		where: { id: params.questId },
	});
	if (!quest || quest.userId !== params.userId) {
		return { ok: false, reason: "not_found" };
	}
	if (quest.status === "COMPLETED") {
		return { ok: false, reason: "already_completed" };
	}

	await db.$transaction([
		db.quest.update({
			where: { id: quest.id },
			data: { status: "COMPLETED", progress: quest.target },
		}),
		db.xpEvent.upsert({
			where: {
				userId_source_refId: {
					userId: params.userId,
					source: "QUEST",
					refId: quest.id,
				},
			},
			create: {
				userId: params.userId,
				source: "QUEST",
				refId: quest.id,
				amount: quest.xpReward,
			},
			update: {},
		}),
	]);

	const updatedStats = await recalculateAndSaveUserStats(params.userId);
	await syncAchievementsForUser(params.userId, updatedStats);
	await recalculateAndSaveUserStats(params.userId);
	return { ok: true, xpAwarded: quest.xpReward };
}
