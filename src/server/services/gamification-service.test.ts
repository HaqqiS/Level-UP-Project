import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACHIEVEMENT_CATALOG } from "@/lib/gamification/achievements";

const mockDb = vi.hoisted(() => {
	const dbObj = {
		quest: {
			findUnique: vi.fn(),
			findMany: vi.fn(),
			createMany: vi.fn(),
			update: vi.fn(),
			count: vi.fn(),
		},
		dailyWellnessLog: {
			findUnique: vi.fn(),
		},
		dailyCheckin: {
			count: vi.fn(),
		},
		plannedSession: {
			findFirst: vi.fn(),
		},
		xpEvent: {
			upsert: vi.fn(),
			aggregate: vi.fn(),
			createMany: vi.fn(),
		},
		setLog: {
			findMany: vi.fn(),
			count: vi.fn(),
		},
		profile: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
		userStats: {
			findUnique: vi.fn(),
			upsert: vi.fn(),
		},
		workoutLog: {
			findUnique: vi.fn(),
			findMany: vi.fn(),
			count: vi.fn(),
		},
		achievement: {
			findMany: vi.fn(),
			createMany: vi.fn(),
			update: vi.fn(),
		},
		userAchievement: {
			findMany: vi.fn(),
			upsert: vi.fn(),
		},
		bodyMetric: {
			count: vi.fn(),
		},
		$transaction: vi.fn(),
	};
	return dbObj;
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/server/services/weekly-plan-service", () => ({
	getCurrentWeeklyPlan: vi.fn(),
	getLocalDateKey: vi.fn(() => "2026-11-19"),
	getWeekStartUtc: vi.fn((dateKey: string) => {
		const date = new Date(`${dateKey}T00:00:00.000Z`);
		const day = date.getUTCDay();
		const diffToMonday = day === 0 ? -6 : 1 - day;
		date.setUTCDate(date.getUTCDate() + diffToMonday);
		return date;
	}),
}));

import {
	completeSideQuest,
	getTodayGamificationReadModel,
	recalculateAndSaveUserStats,
} from "./gamification-service";

function setupConvergenceMocks(options?: {
	totalXp?: number;
	experienceLevel?: string;
	existingRankTier?: string;
}) {
	const totalXp = options?.totalXp ?? 100;
	const experienceLevel = options?.experienceLevel ?? "NONE";

	mockDb.setLog.findMany.mockResolvedValue([]);
	mockDb.profile.findUnique.mockResolvedValue({
		trainingDays: [1, 3, 5],
		timezone: "Asia/Jakarta",
		createdAt: new Date("2026-11-01T00:00:00.000Z"),
		experienceLevel,
	});
	mockDb.userStats.findUnique.mockResolvedValue(
		options?.existingRankTier
			? {
					rankTier: options.existingRankTier,
					equippedTitleKey: null,
				}
			: { equippedTitleKey: null },
	);
	mockDb.xpEvent.aggregate.mockResolvedValue({ _sum: { amount: totalXp } });
	mockDb.workoutLog.findMany.mockResolvedValue([]);
	mockDb.userStats.upsert.mockImplementation(
		async (args: { create: Record<string, unknown> }) => ({
			id: "stats-1",
			equippedTitleKey: null,
			...args.create,
		}),
	);
	mockDb.profile.update.mockResolvedValue({});
	mockDb.achievement.findMany.mockResolvedValue(
		ACHIEVEMENT_CATALOG.map((a, idx) => ({ id: `ach-${idx}`, ...a })),
	);
	mockDb.workoutLog.count.mockResolvedValue(0);
	mockDb.quest.count.mockResolvedValue(0);
	mockDb.setLog.count.mockResolvedValue(0);
	mockDb.bodyMetric.count.mockResolvedValue(0);
	mockDb.userAchievement.findMany.mockResolvedValue([]);
	mockDb.quest.update.mockResolvedValue({});
	mockDb.xpEvent.upsert.mockResolvedValue({});
}

describe("completeSideQuest server-side validation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDb.$transaction.mockImplementation(async (arg: unknown) => {
			if (typeof arg === "function") {
				return (arg as (tx: typeof mockDb) => Promise<unknown>)(mockDb);
			}
			return Promise.all(arg as Promise<unknown>[]);
		});
		setupConvergenceMocks();
	});

	it("rejects WEEKLY quests unconditionally without completing or awarding XP", async () => {
		mockDb.quest.findUnique.mockResolvedValue({
			id: "q-weekly",
			userId: "user-1",
			type: "WEEKLY",
			key: "weekly-sessions",
			title: "Complete scheduled workouts this week",
			target: 3,
			progress: 0,
			status: "PENDING",
			date: "2026-11-16",
			xpReward: 150,
		});

		const res = await completeSideQuest({
			userId: "user-1",
			questId: "q-weekly",
		});

		expect(res).toEqual({ ok: false, reason: "not_allowed" });
		expect(mockDb.$transaction).not.toHaveBeenCalled();
		expect(mockDb.quest.update).not.toHaveBeenCalled();
		expect(mockDb.xpEvent.upsert).not.toHaveBeenCalled();
	});

	it("rejects training-day DAILY quests when a non-rest planned session exists for that date", async () => {
		mockDb.quest.findUnique.mockResolvedValue({
			id: "q-daily-train",
			userId: "user-1",
			type: "DAILY",
			key: "daily-main",
			title: "Complete today's Upper Push session",
			target: 12,
			progress: 0,
			status: "PENDING",
			date: "2026-11-18",
			xpReward: 120,
		});
		mockDb.plannedSession.findFirst.mockResolvedValue({ isRest: false });

		const res = await completeSideQuest({
			userId: "user-1",
			questId: "q-daily-train",
		});

		expect(res).toEqual({ ok: false, reason: "not_allowed" });
		expect(mockDb.plannedSession.findFirst).toHaveBeenCalledWith({
			where: {
				dayOfWeek: 3, // 2026-11-18 is Wednesday
				weeklyPlan: {
					userId: "user-1",
					weekStart: new Date("2026-11-16T00:00:00.000Z"),
				},
			},
			select: { isRest: true },
		});
		expect(mockDb.$transaction).not.toHaveBeenCalled();
		expect(mockDb.xpEvent.upsert).not.toHaveBeenCalled();
	});

	it("rejects stale non-rest DAILY quests even when no planned session row exists", async () => {
		mockDb.quest.findUnique.mockResolvedValue({
			id: "q-daily-stale",
			userId: "user-1",
			type: "DAILY",
			key: "daily-main",
			title: "Complete today's Upper Push session",
			target: 10,
			progress: 0,
			status: "PENDING",
			date: "2026-11-18",
			xpReward: 120,
		});
		mockDb.plannedSession.findFirst.mockResolvedValue(null);

		const res = await completeSideQuest({
			userId: "user-1",
			questId: "q-daily-stale",
		});

		expect(res).toEqual({ ok: false, reason: "not_allowed" });
		expect(mockDb.$transaction).not.toHaveBeenCalled();
	});

	it("allows rest-day DAILY active-recovery quests and awards XP", async () => {
		mockDb.quest.findUnique.mockResolvedValue({
			id: "q-daily-rest",
			userId: "user-1",
			type: "DAILY",
			key: "daily-main",
			title: "Complete active recovery check-in",
			target: 1,
			progress: 0,
			status: "PENDING",
			date: "2026-11-19",
			xpReward: 25,
		});
		mockDb.plannedSession.findFirst.mockResolvedValue({ isRest: true });

		const res = await completeSideQuest({
			userId: "user-1",
			questId: "q-daily-rest",
		});

		expect(res).toEqual({ ok: true, xpAwarded: 25 });
		expect(mockDb.quest.update).toHaveBeenCalledWith({
			where: { id: "q-daily-rest" },
			data: { status: "COMPLETED", progress: 1 },
		});
		expect(mockDb.xpEvent.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				create: expect.objectContaining({
					userId: "user-1",
					source: "QUEST",
					refId: "q-daily-rest",
					amount: 25,
				}),
			}),
		);
	});

	it("allows SIDE quests on training days and awards XP", async () => {
		mockDb.quest.findUnique.mockResolvedValue({
			id: "q-side",
			userId: "user-1",
			type: "SIDE",
			key: "side-mobility",
			title: "2 min wrist & shoulder mobility",
			target: 1,
			progress: 0,
			status: "PENDING",
			date: "2026-11-18",
			xpReward: 15,
		});

		const res = await completeSideQuest({
			userId: "user-1",
			questId: "q-side",
		});

		expect(res).toEqual({ ok: true, xpAwarded: 15 });
		expect(mockDb.plannedSession.findFirst).not.toHaveBeenCalled();
		expect(mockDb.quest.update).toHaveBeenCalledWith({
			where: { id: "q-side" },
			data: { status: "COMPLETED", progress: 1 },
		});
	});
});

describe("recalculateAndSaveUserStats atomic experience floor", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDb.$transaction.mockImplementation(async (arg: unknown) => {
			if (typeof arg === "function") {
				return (arg as (tx: typeof mockDb) => Promise<unknown>)(mockDb);
			}
			return Promise.all(arg as Promise<unknown>[]);
		});
	});

	it("atomically upgrades experienceLevel inside $transaction even when rankTier did not increase", async () => {
		setupConvergenceMocks({
			totalXp: 16500,
			experienceLevel: "NONE",
			existingRankTier: "C",
		});

		const stats = await recalculateAndSaveUserStats("user-1", {
			bronzeCount: 10,
			silverCount: 5,
			goldCount: 1,
			maxDifficultyMastered: 4,
			masteredPatternsCount: 2,
		});

		expect(stats.rankTier).toBe("C");
		expect(stats.effectiveExperienceLevel).toBe("INTERMEDIATE");
		expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
		expect(mockDb.userStats.upsert).toHaveBeenCalledTimes(1);
		expect(mockDb.profile.update).toHaveBeenCalledWith({
			where: { userId: "user-1" },
			data: { experienceLevel: "INTERMEDIATE" },
		});
	});

	it("does not downgrade profile experienceLevel when already above rank floor", async () => {
		setupConvergenceMocks({
			totalXp: 500,
			experienceLevel: "ADVANCED",
			existingRankTier: "F",
		});

		const stats = await recalculateAndSaveUserStats("user-1", {
			bronzeCount: 0,
			silverCount: 0,
			goldCount: 0,
			maxDifficultyMastered: 0,
			masteredPatternsCount: 0,
		});

		expect(stats.rankTier).toBe("F");
		expect(stats.effectiveExperienceLevel).toBe("ADVANCED");
		expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
		expect(mockDb.profile.update).not.toHaveBeenCalled();
	});
});

describe("getTodayGamificationReadModel fast path & safety fallbacks", () => {
	const baseProfile = {
		onboardingCompletedAt: new Date("2026-11-16T00:00:00.000Z"),
		disclaimerAcceptedAt: new Date("2026-11-16T00:00:00.000Z"),
		timezone: "Asia/Jakarta",
		trainingDays: [1, 3, 5],
		createdAt: new Date("2026-11-19T00:00:00.000Z"),
		experienceLevel: "BEGINNER",
	};

	const freshQuests = [
		{
			id: "q-d1",
			type: "DAILY" as const,
			key: "daily-main",
			title: "Complete active recovery check-in",
			target: 1,
			progress: 0,
			status: "PENDING" as const,
			date: "2026-11-19",
			xpReward: 25,
		},
		{
			id: "q-s1",
			type: "SIDE" as const,
			key: "side-hydrate",
			title: "Drink 2L water today",
			target: 1,
			progress: 0,
			status: "PENDING" as const,
			date: "2026-11-19",
			xpReward: 15,
		},
		{
			id: "q-s2",
			type: "SIDE" as const,
			key: "side-mobility",
			title: "2 min wrist & shoulder mobility",
			target: 1,
			progress: 0,
			status: "PENDING" as const,
			date: "2026-11-19",
			xpReward: 15,
		},
		{
			id: "q-w1",
			type: "WEEKLY" as const,
			key: "weekly-sessions",
			title: "Complete scheduled workouts this week",
			target: 3,
			progress: 0,
			status: "PENDING" as const,
			date: "2026-11-16",
			xpReward: 150,
		},
		{
			id: "q-w2",
			type: "WEEKLY" as const,
			key: "weekly-sets",
			title: "Log target sets this week",
			target: 27,
			progress: 0,
			status: "PENDING" as const,
			date: "2026-11-16",
			xpReward: 150,
		},
		{
			id: "q-w3",
			type: "WEEKLY" as const,
			key: "weekly-checkin",
			title: "Complete pre-workout check-ins this week",
			target: 3,
			progress: 0,
			status: "PENDING" as const,
			date: "2026-11-16",
			xpReward: 150,
		},
	];

	const freshStats = {
		totalXp: 350,
		level: 2,
		rankTier: "F" as const,
		tierLevel: 2,
		equippedTitleKey: "first-quest",
		currentStreak: 0,
		longestStreak: 0,
		freezesAvailable: 1,
		freezeWeekKey: "2026-11-16",
		lastActiveDate: null,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockDb.$transaction.mockImplementation(async (arg: unknown) => {
			if (typeof arg === "function") {
				return (arg as (tx: typeof mockDb) => Promise<unknown>)(mockDb);
			}
			return Promise.all(arg as Promise<unknown>[]);
		});
		setupConvergenceMocks({ totalXp: 350, experienceLevel: "BEGINNER" });
		mockDb.quest.createMany.mockResolvedValue({ count: 0 });
		mockDb.quest.findMany.mockResolvedValue(freshQuests.slice(0, 3));
		mockDb.dailyWellnessLog.findUnique.mockResolvedValue({ hydrationMl: 0 });
		mockDb.dailyCheckin.count.mockResolvedValue(0);
	});

	it("returns exact GamificationSummary & quests with ZERO DB calls on warm fast path", async () => {
		const res = await getTodayGamificationReadModel({
			userId: "user-1",
			profile: baseProfile,
			plan: null,
			todayKey: "2026-11-19",
			todayDayOfWeek: 4,
			todayLog: null,
			todayHydrationMl: 500,
			existingStats: freshStats,
			allRelevantQuests: freshQuests,
			completedWorkoutDates: [],
		});

		expect(res.stats.totalXp).toBe(350);
		expect(res.stats.rankTier).toBe("F");
		expect(res.stats.equippedTitle).toBe("First Step");
		expect(res.stats.levelProgress).toMatchObject({
			rankTier: "F",
			tierLevel: 2,
			currentLevelXp: 50,
			requiredLevelXp: 300,
			isPromotionReady: false,
		});
		expect(res.quests).toHaveLength(3);
		expect(res.weeklyQuests).toHaveLength(3);
		expect(mockDb.quest.createMany).not.toHaveBeenCalled();
		expect(mockDb.userStats.upsert).not.toHaveBeenCalled();
		expect(mockDb.profile.findUnique).not.toHaveBeenCalled();
		expect(mockDb.setLog.findMany).not.toHaveBeenCalled();
	});

	it("falls back to ensureTodayQuestsAndStats on day rollover while reusing preloaded profile/plan/todayLog", async () => {
		await getTodayGamificationReadModel({
			userId: "user-1",
			profile: baseProfile,
			plan: null,
			todayKey: "2026-11-19",
			todayDayOfWeek: 4,
			todayLog: null,
			todayHydrationMl: 0,
			existingStats: freshStats,
			allRelevantQuests: freshQuests.slice(3), // missing today's 3 daily/side quests
			completedWorkoutDates: [],
		});

		expect(mockDb.quest.createMany).toHaveBeenCalled();
		expect(mockDb.userStats.upsert).toHaveBeenCalled();
		// Preloaded todayLog was reused — no redundant workoutLog.findUnique
		expect(mockDb.workoutLog.findUnique).not.toHaveBeenCalled();
	});

	it("falls back when hydration >= 2000 ml and side-hydrate is still PENDING", async () => {
		await getTodayGamificationReadModel({
			userId: "user-1",
			profile: baseProfile,
			plan: null,
			todayKey: "2026-11-19",
			todayDayOfWeek: 4,
			todayLog: null,
			todayHydrationMl: 2250,
			existingStats: freshStats,
			allRelevantQuests: freshQuests,
			completedWorkoutDates: [],
		});

		expect(mockDb.quest.createMany).toHaveBeenCalled();
		expect(mockDb.userStats.upsert).toHaveBeenCalled();
	});

	it("falls back when persisted streak drifted from evaluated streak history", async () => {
		await getTodayGamificationReadModel({
			userId: "user-1",
			profile: baseProfile,
			plan: null,
			todayKey: "2026-11-19",
			todayDayOfWeek: 4,
			todayLog: null,
			todayHydrationMl: 0,
			existingStats: { ...freshStats, currentStreak: 5 }, // stale streak
			allRelevantQuests: freshQuests,
			completedWorkoutDates: [],
		});

		expect(mockDb.userStats.upsert).toHaveBeenCalled();
	});

	it("falls back when existingStats is null (brand-new onboarded account)", async () => {
		await getTodayGamificationReadModel({
			userId: "user-1",
			profile: baseProfile,
			plan: null,
			todayKey: "2026-11-19",
			todayDayOfWeek: 4,
			todayLog: null,
			todayHydrationMl: 0,
			existingStats: null,
			allRelevantQuests: freshQuests,
			completedWorkoutDates: [],
		});

		expect(mockDb.userStats.upsert).toHaveBeenCalled();
	});
});
