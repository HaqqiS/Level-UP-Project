import { describe, expect, it } from "vitest";
import {
	ACHIEVEMENT_CATALOG,
	evaluateUnlockedAchievements,
} from "./achievements";

const emptySnapshot = {
	completedSessionsCount: 0,
	completedQuestsCount: 0,
	completedWeeklyQuestsCount: 0,
	longestStreak: 0,
	totalSetsLogged: 0,
	skillSetsLogged: 0,
	level: 1,
	bodyMetricsCount: 0,
};

describe("evaluateUnlockedAchievements", () => {
	it("unlocks achievements only when criteria are met", () => {
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
			},
			new Set(),
		);
		expect(unlocked.map((a) => a.key)).toContain("first-quest");
		expect(unlocked.map((a) => a.key)).toContain("streak-3");
		expect(unlocked.map((a) => a.key)).toContain("centurion-sets");
		expect(unlocked.map((a) => a.key)).toContain("level-3");
		expect(unlocked.map((a) => a.key)).toContain("skill-seeker");
		expect(unlocked.map((a) => a.key)).toContain("body-tracker");
		expect(unlocked.map((a) => a.key)).toContain("weekly-champion");
		expect(unlocked.map((a) => a.key)).not.toContain("streak-7");
	});

	it("never re-awards already unlocked achievements", () => {
		const fullSnapshot = {
			completedSessionsCount: 5,
			completedQuestsCount: 10,
			completedWeeklyQuestsCount: 2,
			longestStreak: 10,
			totalSetsLogged: 50,
			skillSetsLogged: 5,
			level: 5,
			bodyMetricsCount: 4,
		};
		const allKeys = new Set(ACHIEVEMENT_CATALOG.map((a) => a.key));
		expect(evaluateUnlockedAchievements(fullSnapshot, allKeys)).toEqual([]);
	});
});
