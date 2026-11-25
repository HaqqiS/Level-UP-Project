import "server-only";
import { db } from "@/lib/db";
import type { ExperienceLevel } from "@/lib/exercises/eligibility";
import {
	ACHIEVEMENT_CATALOG,
	evaluateUnlockedAchievements,
	getAchievementByKey,
	getTitleForAchievementKey,
} from "@/lib/gamification/achievements";
import {
	buildDailyQuestTemplates,
	buildWeeklyQuestTemplates,
	canManuallyCompleteQuest,
	computeMasteryXp,
	EMPTY_DIRECT_MASTERY_SNAPSHOT,
	evaluateRankProgress,
	evaluateStreakHistory,
	getIsoWeekKey,
	type RankTier,
	resolveEffectiveExperienceLevel,
} from "@/lib/gamification/engine";
import {
	type DirectMasterySnapshot,
	evaluateDirectExerciseMastery,
} from "@/lib/gamification/skill-tree";
import { assertCanGeneratePlan } from "@/server/services/plan-gate";
import {
	getCurrentWeeklyPlan,
	getLocalDateKey,
	getWeekStartUtc,
} from "@/server/services/weekly-plan-service";

function addDaysKey(dateKey: string, days: number): string {
	const d = new Date(`${dateKey}T00:00:00.000Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}

export async function syncDirectMasteryXpForUser(
	userId: string,
): Promise<DirectMasterySnapshot> {
	const rawSetLogs = await db.setLog.findMany({
		where: { workoutLog: { userId } },
		orderBy: [
			{ workoutLog: { date: "asc" } },
			{ completedAt: "asc" },
			{ setNumber: "asc" },
		],
		select: {
			workoutLogId: true,
			exerciseId: true,
			reps: true,
			seconds: true,
			rpe: true,
			workoutLog: { select: { date: true } },
		},
	});

	if (rawSetLogs.length === 0) {
		return EMPTY_DIRECT_MASTERY_SNAPSHOT;
	}

	const exerciseIds = [...new Set(rawSetLogs.map((s) => s.exerciseId))];
	const exercises = await db.exercise.findMany({
		where: { id: { in: exerciseIds } },
		select: {
			id: true,
			slug: true,
			name: true,
			pattern: true,
			difficulty: true,
			measure: true,
			progressionNextId: true,
			masteryTargetSets: true,
			masteryTargetReps: true,
			masteryTargetSeconds: true,
			masteryBenchmarks: {
				select: {
					tier: true,
					targetSets: true,
					targetReps: true,
					targetSeconds: true,
					minConsecutiveSessions: true,
					maxRpe: true,
					tempo: true,
					formStandard: true,
					unlocksNext: true,
				},
			},
		},
	});

	const setLogs = rawSetLogs.map((s) => ({
		workoutLogId: s.workoutLogId,
		exerciseId: s.exerciseId,
		reps: s.reps,
		seconds: s.seconds,
		rpe: s.rpe,
		date: s.workoutLog.date,
	}));

	const evaluation = evaluateDirectExerciseMastery({ exercises, setLogs });
	if (evaluation.awards.length > 0) {
		await db.xpEvent.createMany({
			data: evaluation.awards.map((a) => ({
				userId,
				source: "MASTERY",
				refId: `mastery:${a.exerciseId}:${a.tier}`,
				amount: computeMasteryXp(a.difficulty, a.tier),
			})),
			skipDuplicates: true,
		});
	}

	return evaluation.snapshot;
}

export async function syncHydrationQuestForDate(
	userId: string,
	dateKey: string,
): Promise<boolean> {
	const log = await db.dailyWellnessLog.findUnique({
		where: { userId_date: { userId, date: dateKey } },
		select: { hydrationMl: true },
	});
	if ((log?.hydrationMl ?? 0) < 2000) {
		return false;
	}

	const quest = await db.quest.findUnique({
		where: { userId_key_date: { userId, key: "side-hydrate", date: dateKey } },
	});
	if (!quest || quest.status === "COMPLETED") {
		return false;
	}

	await db.$transaction([
		db.quest.update({
			where: { id: quest.id },
			data: { status: "COMPLETED", progress: quest.target },
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

	return true;
}

export async function recalculateAndSaveUserStats(
	userId: string,
	precomputedMastery?: DirectMasterySnapshot,
) {
	const masterySnapshot =
		precomputedMastery ?? (await syncDirectMasteryXpForUser(userId));

	const [profile, existingStats, xpSum, completedLogs] = await Promise.all([
		db.profile.findUnique({
			where: { userId },
			select: {
				trainingDays: true,
				timezone: true,
				createdAt: true,
				experienceLevel: true,
			},
		}),
		db.userStats.findUnique({
			where: { userId },
			select: { equippedTitleKey: true },
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
	const levelProgress = evaluateRankProgress(totalXp, masterySnapshot);
	const streak = evaluateStreakHistory({
		scheduledDays: profile?.trainingDays ?? [],
		completedDates: completedLogs.map((l) => l.date),
		startDateKey,
		todayDateKey: todayKey,
	});

	const hasInvalidTitleKey = Boolean(
		existingStats?.equippedTitleKey &&
			!getTitleForAchievementKey(existingStats.equippedTitleKey),
	);

	const currentExperienceLevel = (profile?.experienceLevel ??
		"NONE") as ExperienceLevel;
	const effectiveExperienceLevel = profile
		? resolveEffectiveExperienceLevel(
				currentExperienceLevel,
				levelProgress.rankTier,
			)
		: currentExperienceLevel;
	const shouldUpgradeExperience =
		Boolean(profile) && effectiveExperienceLevel !== currentExperienceLevel;

	const stats = await db.$transaction(async (tx) => {
		const upsertedStats = await tx.userStats.upsert({
			where: { userId },
			create: {
				userId,
				totalXp,
				level: levelProgress.level,
				rankTier: levelProgress.rankTier,
				tierLevel: levelProgress.tierLevel,
				currentStreak: streak.currentStreak,
				longestStreak: streak.longestStreak,
				freezesAvailable: streak.freezesAvailable,
				freezeWeekKey: streak.freezeWeekKey,
				lastActiveDate: streak.lastActiveDate,
			},
			update: {
				totalXp,
				level: levelProgress.level,
				rankTier: levelProgress.rankTier,
				tierLevel: levelProgress.tierLevel,
				...(hasInvalidTitleKey ? { equippedTitleKey: null } : {}),
				currentStreak: streak.currentStreak,
				longestStreak: streak.longestStreak,
				freezesAvailable: streak.freezesAvailable,
				freezeWeekKey: streak.freezeWeekKey,
				lastActiveDate: streak.lastActiveDate,
			},
		});

		if (shouldUpgradeExperience) {
			await tx.profile.update({
				where: { userId },
				data: { experienceLevel: effectiveExperienceLevel },
			});
		}

		return upsertedStats;
	});

	return {
		...stats,
		rankTier: levelProgress.rankTier,
		equippedTitle: getTitleForAchievementKey(stats.equippedTitleKey),
		levelProgress,
		freezeUsedThisWeek: streak.freezeUsedThisWeek,
		lastFrozenDate: streak.lastFrozenDate,
		masterySnapshot,
		effectiveExperienceLevel,
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
	const templateByKey = new Map(templates.map((t) => [t.key, t]));

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
		const template = templateByKey.get(quest.key);
		const targetXpReward =
			quest.status === "PENDING" && template
				? template.xpReward
				: quest.xpReward;
		const xpRewardChanged = targetXpReward !== quest.xpReward;
		const newlyCompleted = quest.status === "PENDING" && capped >= quest.target;

		if (newlyCompleted) {
			await db.$transaction([
				db.quest.update({
					where: { id: quest.id },
					data: {
						progress: quest.target,
						status: "COMPLETED",
						...(xpRewardChanged ? { xpReward: targetXpReward } : {}),
					},
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
						amount: targetXpReward,
					},
					update: {},
				}),
			]);
		} else if (
			quest.status === "PENDING" &&
			(capped !== quest.progress || xpRewardChanged)
		) {
			await db.quest.update({
				where: { id: quest.id },
				data: {
					progress: capped,
					...(xpRewardChanged ? { xpReward: targetXpReward } : {}),
				},
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
	stats: { level: number; rankTier: RankTier; longestStreak: number },
	masterySnapshot?: DirectMasterySnapshot,
) {
	const mastery = masterySnapshot ?? (await syncDirectMasteryXpForUser(userId));

	const existingCatalog = await db.achievement.findMany();
	const existingByKey = new Map(existingCatalog.map((row) => [row.key, row]));

	const missingDefs = ACHIEVEMENT_CATALOG.filter(
		(a) => !existingByKey.has(a.key),
	);
	if (missingDefs.length > 0) {
		await db.achievement.createMany({
			data: missingDefs.map((a) => ({
				key: a.key,
				title: a.title,
				description: a.description,
				category: a.category,
				xpReward: a.xpReward,
				titleReward: a.titleReward,
			})),
			skipDuplicates: true,
		});
	}

	const staleUpdates = ACHIEVEMENT_CATALOG.flatMap((a) => {
		const row = existingByKey.get(a.key);
		if (!row) return [];
		if (
			row.title === a.title &&
			row.description === a.description &&
			row.category === a.category &&
			row.xpReward === a.xpReward &&
			row.titleReward === a.titleReward
		) {
			return [];
		}
		return [
			db.achievement.update({
				where: { key: a.key },
				data: {
					title: a.title,
					description: a.description,
					category: a.category,
					xpReward: a.xpReward,
					titleReward: a.titleReward,
				},
			}),
		];
	});
	if (staleUpdates.length > 0) {
		await db.$transaction(staleUpdates);
	}

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
		missingDefs.length > 0
			? db.achievement.findMany()
			: Promise.resolve(existingCatalog),
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
			rankTier: stats.rankTier,
			directBronzeCount: mastery.bronzeCount,
			directSilverCount: mastery.silverCount,
			directGoldCount: mastery.goldCount,
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

	const finalUnlocked =
		newlyUnlocked.length > 0
			? await db.userAchievement.findMany({
					where: { userId },
					include: { achievement: { select: { key: true } } },
				})
			: userAchievements;
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
			titleReward: def.titleReward,
			unlockedAt: unlockedAtByKey.get(def.key) ?? null,
		})),
	};
}

/**
 * Bounded 2-pass convergence so badge XP unlocked on pass 1 (e.g. mastery or rank badges)
 * updates stats/level/rank and cascades at most one additional pass without unbounded loops.
 */
export async function syncStatsAndAchievementsConverged(
	userId: string,
	precomputedMastery?: DirectMasterySnapshot,
) {
	const masterySnapshot =
		precomputedMastery ?? (await syncDirectMasteryXpForUser(userId));
	const stats1 = await recalculateAndSaveUserStats(userId, masterySnapshot);
	const sync1 = await syncAchievementsForUser(userId, stats1, masterySnapshot);

	if (sync1.newlyUnlockedCount === 0) {
		return {
			stats: stats1,
			achievements: sync1.achievements,
			masterySnapshot,
		};
	}

	const stats2 = await recalculateAndSaveUserStats(userId, masterySnapshot);
	const sync2 = await syncAchievementsForUser(userId, stats2, masterySnapshot);
	const finalStats =
		sync2.newlyUnlockedCount > 0
			? await recalculateAndSaveUserStats(userId, masterySnapshot)
			: stats2;

	return {
		stats: finalStats,
		achievements: sync2.achievements,
		masterySnapshot,
	};
}

export async function ensureTodayQuestsAndStats(
	userId: string,
	precomputedMastery?: DirectMasterySnapshot,
) {
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
	const templateByKey = new Map(templates.map((t) => [t.key, t]));

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
	const existingDailySide = await db.quest.findMany({
		where: { userId, date: todayKey, type: { in: ["DAILY", "SIDE"] } },
	});

	for (const quest of existingDailySide) {
		if (quest.status !== "PENDING") continue;
		const tpl = templateByKey.get(quest.key);
		if (!tpl) continue;

		if (quest.key === mainTemplate.key) {
			const setsDone = todayLog?.sets.length ?? 0;
			const nextProgress = Math.min(mainTemplate.target, setsDone);
			if (
				quest.target !== mainTemplate.target ||
				quest.title !== mainTemplate.title ||
				quest.progress !== nextProgress ||
				quest.xpReward !== mainTemplate.xpReward
			) {
				await db.quest.update({
					where: { id: quest.id },
					data: {
						title: mainTemplate.title,
						target: mainTemplate.target,
						progress: nextProgress,
						xpReward: mainTemplate.xpReward,
					},
				});
			}
		} else if (quest.xpReward !== tpl.xpReward) {
			await db.quest.update({
				where: { id: quest.id },
				data: { xpReward: tpl.xpReward },
			});
		}
	}

	await syncHydrationQuestForDate(userId, todayKey);

	const plannedWeeklySets = plan
		? plan.sessions.reduce(
				(sum, s) => sum + s.exercises.reduce((exSum, ex) => exSum + ex.sets, 0),
				0,
			)
		: profile.trainingDays.length * 9;

	const [quests, weeklyQuests] = await Promise.all([
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
	]);

	const { stats, achievements } = await syncStatsAndAchievementsConverged(
		userId,
		precomputedMastery,
	);

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
	const { stats, achievements } =
		await syncStatsAndAchievementsConverged(userId);
	return {
		stats,
		achievements,
		experienceLevel: stats.effectiveExperienceLevel,
	};
}

export type CompleteQuestResult =
	| { ok: true; xpAwarded: number }
	| { ok: false; reason: "not_found" | "already_completed" | "not_allowed" };

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
	if (quest.type === "WEEKLY") {
		return { ok: false, reason: "not_allowed" };
	}

	if (quest.type === "DAILY") {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(quest.date)) {
			return { ok: false, reason: "not_allowed" };
		}
		const weekStart = getWeekStartUtc(quest.date);
		const dayOfWeek = new Date(`${quest.date}T00:00:00.000Z`).getUTCDay();
		const plannedSession = await db.plannedSession.findFirst({
			where: {
				dayOfWeek,
				weeklyPlan: {
					userId: params.userId,
					weekStart,
				},
			},
			select: { isRest: true },
		});
		const hasNonRestPlannedSession = Boolean(
			plannedSession && !plannedSession.isRest,
		);
		const isActiveRecoveryQuest = quest.target === 1 && quest.xpReward <= 25;
		if (
			!canManuallyCompleteQuest({
				type: quest.type,
				hasNonRestPlannedSession,
				isActiveRecoveryQuest,
			})
		) {
			return { ok: false, reason: "not_allowed" };
		}
	} else if (quest.type !== "SIDE") {
		return { ok: false, reason: "not_allowed" };
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

	await syncStatsAndAchievementsConverged(params.userId);
	return { ok: true, xpAwarded: quest.xpReward };
}

export type EquipTitleResult =
	| { ok: true; equippedTitleKey: string | null; equippedTitle: string | null }
	| { ok: false; reason: "invalid" | "not_unlocked" };

async function ensureUserStatsRowExists(userId: string): Promise<void> {
	const existing = await db.userStats.findUnique({
		where: { userId },
		select: { id: true },
	});
	if (!existing) {
		await recalculateAndSaveUserStats(userId);
	}
}

export async function equipTitleForUser(params: {
	userId: string;
	achievementKey: string | null;
}): Promise<EquipTitleResult> {
	const { userId, achievementKey } = params;

	if (achievementKey === null) {
		await ensureUserStatsRowExists(userId);
		await db.userStats.update({
			where: { userId },
			data: { equippedTitleKey: null },
		});
		return { ok: true, equippedTitleKey: null, equippedTitle: null };
	}

	const def = getAchievementByKey(achievementKey);
	if (!def) {
		return { ok: false, reason: "invalid" };
	}

	const unlocked = await db.userAchievement.findFirst({
		where: {
			userId,
			achievement: { key: achievementKey },
		},
		select: { id: true },
	});
	if (!unlocked) {
		return { ok: false, reason: "not_unlocked" };
	}

	await ensureUserStatsRowExists(userId);
	await db.userStats.update({
		where: { userId },
		data: { equippedTitleKey: achievementKey },
	});

	return {
		ok: true,
		equippedTitleKey: achievementKey,
		equippedTitle: def.titleReward,
	};
}
