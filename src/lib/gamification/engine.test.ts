import { describe, expect, it } from "vitest";
import {
	buildDailyQuestTemplates,
	buildWeeklyQuestTemplates,
	computeSessionXp,
	computeStreakBonusXp,
	evaluateStreakHistory,
	getLevelProgress,
	xpThresholdForLevel,
} from "./engine";

describe("level & XP calculations", () => {
	it("computes level curve using 100 * n^1.5", () => {
		expect(xpThresholdForLevel(1)).toBe(100);
		expect(xpThresholdForLevel(2)).toBe(282);
		expect(getLevelProgress(0)).toMatchObject({ level: 1, progressPercent: 0 });
		expect(getLevelProgress(100)).toMatchObject({
			level: 2,
			currentLevelXp: 0,
			requiredLevelXp: 182,
		});
		expect(getLevelProgress(282).level).toBe(3);
	});

	it("computes fair completion-based session XP and capped streak bonus", () => {
		expect(computeSessionXp(0, 10)).toBe(0);
		expect(computeSessionXp(5, 10)).toBe(50);
		expect(computeSessionXp(10, 10)).toBe(100);
		expect(computeSessionXp(12, 10)).toBe(100);
		expect(computeStreakBonusXp(3)).toBe(15);
		expect(computeStreakBonusXp(20)).toBe(50);
	});
});

describe("evaluateStreakHistory", () => {
	// Training days: Mon (1), Wed (3), Fri (5)
	const scheduledDays = [1, 3, 5];

	it("keeps streak intact across scheduled rest days", () => {
		// 2026-11-16 is Monday, 2026-11-18 is Wednesday, 2026-11-19 is Thursday (rest)
		const res = evaluateStreakHistory({
			scheduledDays,
			completedDates: ["2026-11-16", "2026-11-18"],
			startDateKey: "2026-11-16",
			todayDateKey: "2026-11-19",
		});
		expect(res.currentStreak).toBe(2);
		expect(res.freezesAvailable).toBe(1);
	});

	it("consumes 1 streak freeze on first missed scheduled day, resets on second miss same week", () => {
		// Missed Wed (2026-11-18) -> consumes freeze, streak stays 1 on Thu (2026-11-19)
		const withFreeze = evaluateStreakHistory({
			scheduledDays,
			completedDates: ["2026-11-16"],
			startDateKey: "2026-11-16",
			todayDateKey: "2026-11-19",
		});
		expect(withFreeze.currentStreak).toBe(1);
		expect(withFreeze.freezesAvailable).toBe(0);
		expect(withFreeze.freezeUsedThisWeek).toBe(true);
		expect(withFreeze.lastFrozenDate).toBe("2026-11-18");
		expect(withFreeze.frozenDates).toEqual(["2026-11-18"]);

		// Also missed Fri (2026-11-20) -> no freeze left, streak resets by Sat (2026-11-21)
		const resetAfterSecondMiss = evaluateStreakHistory({
			scheduledDays,
			completedDates: ["2026-11-16"],
			startDateKey: "2026-11-16",
			todayDateKey: "2026-11-21",
		});
		expect(resetAfterSecondMiss.currentStreak).toBe(0);
		expect(resetAfterSecondMiss.longestStreak).toBe(1);
		expect(resetAfterSecondMiss.freezeUsedThisWeek).toBe(true);
	});

	it("refreshes freeze on a new ISO week", () => {
		// 2026-11-23 is next Monday -> new ISO week restores freeze to 1
		const nextWeek = evaluateStreakHistory({
			scheduledDays,
			completedDates: ["2026-11-16", "2026-11-20"], // missed Wed 18th -> used freeze
			startDateKey: "2026-11-16",
			todayDateKey: "2026-11-23",
		});
		expect(nextWeek.currentStreak).toBe(2);
		expect(nextWeek.freezesAvailable).toBe(1);
		expect(nextWeek.freezeUsedThisWeek).toBe(false);
		expect(nextWeek.lastFrozenDate).toBe("2026-11-18");
	});
});

describe("buildDailyQuestTemplates", () => {
	it("creates 1 main quest and 2 deterministic side quests", () => {
		const q1 = buildDailyQuestTemplates({
			dateKey: "2026-11-19",
			isRestDay: false,
			sessionFocus: "Upper Push",
			plannedSetsCount: 12,
		});
		const q2 = buildDailyQuestTemplates({
			dateKey: "2026-11-19",
			isRestDay: false,
			sessionFocus: "Upper Push",
			plannedSetsCount: 12,
		});
		expect(q1).toEqual(q2);
		expect(q1).toHaveLength(3);
		expect(q1[0]).toMatchObject({ type: "DAILY", target: 12, xpReward: 100 });
		expect(q1[1].xpReward).toBe(25);
		expect(q1[2].xpReward).toBe(25);
		expect(q1[1].key).not.toBe(q1[2].key);
	});
});

describe("buildWeeklyQuestTemplates", () => {
	it("creates 3 weekly quests with 200 XP reward each", () => {
		const weekly = buildWeeklyQuestTemplates({
			scheduledDaysCount: 4,
			plannedWeeklySets: 36,
		});
		expect(weekly).toHaveLength(3);
		expect(weekly.every((q) => q.type === "WEEKLY" && q.xpReward === 200)).toBe(
			true,
		);
		expect(weekly[0]?.target).toBe(4);
		expect(weekly[1]?.target).toBe(36);
		expect(weekly[2]?.target).toBe(3);
	});
});
