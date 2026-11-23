import { describe, expect, it } from "vitest";
import {
	ACHIEVEMENT_CATALOG,
	type AchievementMetricsSnapshot,
	evaluateUnlockedAchievements,
	getAchievementByKey,
	getTitleForAchievementKey,
} from "./achievements";

const emptySnapshot: AchievementMetricsSnapshot = {
	completedSessionsCount: 0,
	completedQuestsCount: 0,
	completedWeeklyQuestsCount: 0,
	longestStreak: 0,
	totalSetsLogged: 0,
	skillSetsLogged: 0,
	level: 1,
	bodyMetricsCount: 0,
	rankTier: "F",
	directBronzeCount: 0,
	directSilverCount: 0,
	directGoldCount: 0,
};

describe("ACHIEVEMENT_CATALOG & title helpers", () => {
	it("contains all 17 unique achievements with non-empty title rewards", () => {
		expect(ACHIEVEMENT_CATALOG).toHaveLength(17);
		const keys = new Set(ACHIEVEMENT_CATALOG.map((a) => a.key));
		expect(keys.size).toBe(17);
		expect(
			ACHIEVEMENT_CATALOG.every((a) => a.titleReward.trim().length > 0),
		).toBe(true);

		expect(getAchievementByKey("first-quest")).toMatchObject({
			xpReward: 50,
			titleReward: "First Step",
		});
		expect(getAchievementByKey("unknown")).toBeUndefined();

		expect(getTitleForAchievementKey("first-quest")).toBe("First Step");
		expect(getTitleForAchievementKey("streak-3")).toBe("Momentum");
		expect(getTitleForAchievementKey("streak-7")).toBe("Unbreakable");
		expect(getTitleForAchievementKey("centurion-sets")).toBe("Iron Rep");
		expect(getTitleForAchievementKey("level-3")).toBe("Rising Athlete");
		expect(getTitleForAchievementKey("skill-seeker")).toBe("Skill Seeker");
		expect(getTitleForAchievementKey("body-tracker")).toBe("Self-Aware");
		expect(getTitleForAchievementKey("weekly-champion")).toBe(
			"Weekly Champion",
		);
		expect(getTitleForAchievementKey("mastery-bronze")).toBe(
			"Foundation Forged",
		);
		expect(getTitleForAchievementKey("mastery-silver")).toBe("Form Craftsman");
		expect(getTitleForAchievementKey("mastery-gold")).toBe("Skill Virtuoso");
		expect(getTitleForAchievementKey("rank-e")).toBe("Awakened");
		expect(getTitleForAchievementKey("rank-d")).toBe("Disciplined");
		expect(getTitleForAchievementKey("rank-c")).toBe("Vanguard");
		expect(getTitleForAchievementKey("rank-b")).toBe("Ascendant");
		expect(getTitleForAchievementKey("rank-a")).toBe("Grandmaster");
		expect(getTitleForAchievementKey("rank-s")).toBe("Apex Sovereign");
		expect(getTitleForAchievementKey(null)).toBeNull();
		expect(getTitleForAchievementKey(undefined)).toBeNull();
		expect(getTitleForAchievementKey("")).toBeNull();
		expect(getTitleForAchievementKey("does-not-exist")).toBeNull();
	});
});

describe("evaluateUnlockedAchievements", () => {
	it("unlocks legacy, mastery, and rank achievements only when criteria are met", () => {
		expect(evaluateUnlockedAchievements(emptySnapshot, new Set())).toEqual([]);

		const unlocked = evaluateUnlockedAchievements(
			{
				...emptySnapshot,
				completedSessionsCount: 1,
				longestStreak: 3,
				totalSetsLogged: 25,
				skillSetsLogged: 2,
				level: 3,
				bodyMetricsCount: 2,
				completedWeeklyQuestsCount: 1,
				rankTier: "C",
				directBronzeCount: 1,
				directSilverCount: 1,
			},
			new Set(),
		);
		const keys = unlocked.map((a) => a.key);
		expect(keys).toContain("first-quest");
		expect(keys).toContain("streak-3");
		expect(keys).toContain("centurion-sets");
		expect(keys).toContain("level-3");
		expect(keys).toContain("skill-seeker");
		expect(keys).toContain("body-tracker");
		expect(keys).toContain("weekly-champion");
		expect(keys).toContain("mastery-bronze");
		expect(keys).toContain("mastery-silver");
		expect(keys).toContain("rank-e");
		expect(keys).toContain("rank-d");
		expect(keys).toContain("rank-c");

		expect(keys).not.toContain("streak-7");
		expect(keys).not.toContain("mastery-gold");
		expect(keys).not.toContain("rank-b");
		expect(keys).not.toContain("rank-a");
		expect(keys).not.toContain("rank-s");
	});

	it("unlocks all 17 achievements at Rank S with Gold mastery and never re-awards", () => {
		const fullSnapshot: AchievementMetricsSnapshot = {
			completedSessionsCount: 5,
			completedQuestsCount: 10,
			completedWeeklyQuestsCount: 2,
			longestStreak: 10,
			totalSetsLogged: 50,
			skillSetsLogged: 5,
			level: 61,
			bodyMetricsCount: 4,
			rankTier: "S",
			directBronzeCount: 20,
			directSilverCount: 10,
			directGoldCount: 6,
		};
		expect(evaluateUnlockedAchievements(fullSnapshot, new Set())).toHaveLength(
			17,
		);
		const allKeys = new Set(ACHIEVEMENT_CATALOG.map((a) => a.key));
		expect(evaluateUnlockedAchievements(fullSnapshot, allKeys)).toEqual([]);
	});
});
