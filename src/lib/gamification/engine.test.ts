import { describe, expect, it } from "vitest";
import {
	buildDailyQuestTemplates,
	buildWeeklyQuestTemplates,
	canManuallyCompleteQuest,
	computeMasteryXp,
	computeSessionXp,
	computeStreakBonusXp,
	deriveLevelProgressFromPersistedStats,
	EMPTY_DIRECT_MASTERY_SNAPSHOT,
	evaluatePromotionGate,
	evaluateRankProgress,
	evaluateStreakHistory,
	getLevelProgress,
	LEVELS_PER_TIER,
	PROMOTION_GATES,
	RANK_TIER_INDEX,
	RANK_TIERS,
	resolveEffectiveExperienceLevel,
	TIER_XP_PER_LEVEL,
	tierEntryXp,
	xpThresholdForLevel,
} from "./engine";
import type { DirectMasterySnapshot } from "./skill-tree";

const FULL_MASTERY: DirectMasterySnapshot = {
	bronzeCount: 20,
	silverCount: 10,
	goldCount: 6,
	maxDifficultyMastered: 7,
	masteredPatternsCount: 3,
};

describe("rank tiers, XP curve & promotion gates", () => {
	it("exposes expected constants and tier entry thresholds", () => {
		expect(RANK_TIERS).toEqual(["F", "E", "D", "C", "B", "A", "S"]);
		expect(LEVELS_PER_TIER).toBe(10);
		expect(RANK_TIER_INDEX).toEqual({
			F: 0,
			E: 1,
			D: 2,
			C: 3,
			B: 4,
			A: 5,
			S: 6,
		});
		expect(TIER_XP_PER_LEVEL).toEqual({
			F: 300,
			E: 500,
			D: 800,
			C: 1200,
			B: 1600,
			A: 2200,
			S: 2500,
		});
		expect(tierEntryXp("F")).toBe(0);
		expect(tierEntryXp("E")).toBe(3000);
		expect(tierEntryXp("D")).toBe(8000);
		expect(tierEntryXp("C")).toBe(16000);
		expect(tierEntryXp("B")).toBe(28000);
		expect(tierEntryXp("A")).toBe(44000);
		expect(tierEntryXp("S")).toBe(66000);
	});

	it("computes stepped global level thresholds across F through unlimited S", () => {
		expect(xpThresholdForLevel(0)).toBe(300);
		expect(xpThresholdForLevel(1)).toBe(300);
		expect(xpThresholdForLevel(2)).toBe(600);
		expect(xpThresholdForLevel(10)).toBe(3000);
		expect(xpThresholdForLevel(11)).toBe(3500);
		expect(xpThresholdForLevel(20)).toBe(8000);
		expect(xpThresholdForLevel(21)).toBe(8800);
		expect(xpThresholdForLevel(30)).toBe(16000);
		expect(xpThresholdForLevel(31)).toBe(17200);
		expect(xpThresholdForLevel(40)).toBe(28000);
		expect(xpThresholdForLevel(41)).toBe(29600);
		expect(xpThresholdForLevel(50)).toBe(44000);
		expect(xpThresholdForLevel(51)).toBe(46200);
		expect(xpThresholdForLevel(60)).toBe(66000);
		expect(xpThresholdForLevel(61)).toBe(68500);
		expect(xpThresholdForLevel(65)).toBe(78500);
	});

	it("evaluates levels and tier boundaries with full mastery gates cleared", () => {
		expect(evaluateRankProgress(-50)).toMatchObject({
			rankTier: "F",
			tierLevel: 1,
			level: 1,
			totalXp: 0,
			currentLevelXp: 0,
			requiredLevelXp: 300,
			progressPercent: 0,
			overflowXp: 0,
			isPromotionReady: false,
			nextTier: "E",
			nextTierEntryXp: 3000,
		});

		expect(evaluateRankProgress(299, FULL_MASTERY)).toMatchObject({
			rankTier: "F",
			tierLevel: 1,
			level: 1,
			currentLevelXp: 299,
			requiredLevelXp: 300,
			progressPercent: 99,
		});

		expect(evaluateRankProgress(300, FULL_MASTERY)).toMatchObject({
			rankTier: "F",
			tierLevel: 2,
			level: 2,
			currentLevelXp: 0,
			requiredLevelXp: 300,
			progressPercent: 0,
		});

		const boundaryCases: Array<{
			xp: number;
			rankTier: string;
			tierLevel: number;
			level: number;
			requiredLevelXp: number;
			nextTier: string | null;
		}> = [
			{
				xp: 2999,
				rankTier: "F",
				tierLevel: 10,
				level: 10,
				requiredLevelXp: 300,
				nextTier: "E",
			},
			{
				xp: 3000,
				rankTier: "E",
				tierLevel: 1,
				level: 11,
				requiredLevelXp: 500,
				nextTier: "D",
			},
			{
				xp: 7999,
				rankTier: "E",
				tierLevel: 10,
				level: 20,
				requiredLevelXp: 500,
				nextTier: "D",
			},
			{
				xp: 8000,
				rankTier: "D",
				tierLevel: 1,
				level: 21,
				requiredLevelXp: 800,
				nextTier: "C",
			},
			{
				xp: 15999,
				rankTier: "D",
				tierLevel: 10,
				level: 30,
				requiredLevelXp: 800,
				nextTier: "C",
			},
			{
				xp: 16000,
				rankTier: "C",
				tierLevel: 1,
				level: 31,
				requiredLevelXp: 1200,
				nextTier: "B",
			},
			{
				xp: 27999,
				rankTier: "C",
				tierLevel: 10,
				level: 40,
				requiredLevelXp: 1200,
				nextTier: "B",
			},
			{
				xp: 28000,
				rankTier: "B",
				tierLevel: 1,
				level: 41,
				requiredLevelXp: 1600,
				nextTier: "A",
			},
			{
				xp: 43999,
				rankTier: "B",
				tierLevel: 10,
				level: 50,
				requiredLevelXp: 1600,
				nextTier: "A",
			},
			{
				xp: 44000,
				rankTier: "A",
				tierLevel: 1,
				level: 51,
				requiredLevelXp: 2200,
				nextTier: "S",
			},
			{
				xp: 65999,
				rankTier: "A",
				tierLevel: 10,
				level: 60,
				requiredLevelXp: 2200,
				nextTier: "S",
			},
			{
				xp: 66000,
				rankTier: "S",
				tierLevel: 1,
				level: 61,
				requiredLevelXp: 2500,
				nextTier: null,
			},
		];

		for (const c of boundaryCases) {
			const res = evaluateRankProgress(c.xp, FULL_MASTERY);
			expect(res).toMatchObject({
				rankTier: c.rankTier,
				tierLevel: c.tierLevel,
				level: c.level,
				requiredLevelXp: c.requiredLevelXp,
				nextTier: c.nextTier,
				overflowXp: 0,
				isPromotionReady: false,
			});
			expect(getLevelProgress(c.xp, FULL_MASTERY)).toEqual(res);
		}
	});

	it("banks overflow XP and holds at X-10 when promotion gate is unmet", () => {
		const heldAtF = getLevelProgress(9500);
		expect(heldAtF).toMatchObject({
			rankTier: "F",
			tierLevel: 10,
			level: 10,
			currentLevelXp: 300,
			requiredLevelXp: 300,
			progressPercent: 100,
			overflowXp: 6500,
			isPromotionReady: true,
			nextTier: "E",
			nextTierEntryXp: 3000,
		});
		expect(heldAtF.promotionGate).toMatchObject({
			fromTier: "F",
			toTier: "E",
			allMet: false,
			bronze: { current: 0, required: 2, met: false },
		});

		const heldAtE = evaluateRankProgress(9500, {
			...EMPTY_DIRECT_MASTERY_SNAPSHOT,
			bronzeCount: 4,
			silverCount: 2,
		});
		expect(heldAtE).toMatchObject({
			rankTier: "E",
			tierLevel: 10,
			level: 20,
			currentLevelXp: 500,
			requiredLevelXp: 500,
			progressPercent: 100,
			overflowXp: 1500,
			isPromotionReady: true,
			nextTier: "D",
			nextTierEntryXp: 8000,
		});
		expect(heldAtE.promotionGate).toMatchObject({
			allMet: false,
			bronze: { current: 4, required: 5, met: false },
			silver: { current: 2, required: 2, met: true },
		});
	});

	it("evaluates promotion gates accurately for every tier F..A", () => {
		expect(PROMOTION_GATES.F.minBronze).toBe(2);
		expect(PROMOTION_GATES.E).toMatchObject({ minBronze: 5, minSilver: 2 });
		expect(PROMOTION_GATES.D).toMatchObject({
			minBronze: 8,
			minSilver: 4,
			minMaxDifficulty: 3,
		});
		expect(PROMOTION_GATES.C).toMatchObject({
			minBronze: 12,
			minSilver: 6,
			minGold: 2,
			minMaxDifficulty: 5,
		});
		expect(PROMOTION_GATES.B).toMatchObject({
			minBronze: 16,
			minSilver: 8,
			minGold: 4,
			minMaxDifficulty: 6,
		});
		expect(PROMOTION_GATES.A).toMatchObject({
			minBronze: 20,
			minSilver: 10,
			minGold: 6,
			minMaxDifficulty: 7,
			minPatterns: 3,
		});

		// Missing just difficulty for D -> C
		expect(
			evaluatePromotionGate("D", {
				bronzeCount: 8,
				silverCount: 4,
				goldCount: 0,
				maxDifficultyMastered: 2,
				masteredPatternsCount: 1,
			}).allMet,
		).toBe(false);

		// Exact match for D -> C
		expect(
			evaluatePromotionGate("D", {
				bronzeCount: 8,
				silverCount: 4,
				goldCount: 0,
				maxDifficultyMastered: 3,
				masteredPatternsCount: 1,
			}).allMet,
		).toBe(true);

		// Missing just patterns for A -> S
		expect(
			evaluatePromotionGate("A", {
				...FULL_MASTERY,
				masteredPatternsCount: 2,
			}),
		).toMatchObject({
			allMet: false,
			patterns: { current: 2, required: 3, met: false },
		});

		expect(evaluatePromotionGate("A", FULL_MASTERY).allMet).toBe(true);
	});

	it("supports unlimited leveling inside Rank S", () => {
		expect(evaluateRankProgress(68499, FULL_MASTERY)).toMatchObject({
			rankTier: "S",
			tierLevel: 1,
			level: 61,
			currentLevelXp: 2499,
			requiredLevelXp: 2500,
			progressPercent: 99,
			overflowXp: 0,
			isPromotionReady: false,
			nextTier: null,
			nextTierEntryXp: null,
			promotionGate: null,
		});

		expect(evaluateRankProgress(68500, FULL_MASTERY)).toMatchObject({
			rankTier: "S",
			tierLevel: 2,
			level: 62,
			currentLevelXp: 0,
			requiredLevelXp: 2500,
			progressPercent: 0,
		});

		expect(evaluateRankProgress(116000, FULL_MASTERY)).toMatchObject({
			rankTier: "S",
			tierLevel: 21,
			level: 81,
			currentLevelXp: 0,
			requiredLevelXp: 2500,
			progressPercent: 0,
		});
	});

	it("enforces one-way experienceLevel floor by rank tier", () => {
		// Upgrades upward
		expect(resolveEffectiveExperienceLevel("NONE", "E")).toBe("BEGINNER");
		expect(resolveEffectiveExperienceLevel("NONE", "D")).toBe("BEGINNER");
		expect(resolveEffectiveExperienceLevel("NONE", "C")).toBe("INTERMEDIATE");
		expect(resolveEffectiveExperienceLevel("BEGINNER", "B")).toBe(
			"INTERMEDIATE",
		);
		expect(resolveEffectiveExperienceLevel("INTERMEDIATE", "A")).toBe(
			"ADVANCED",
		);
		expect(resolveEffectiveExperienceLevel("NONE", "S")).toBe("ADVANCED");

		// Never downgrades
		expect(resolveEffectiveExperienceLevel("ADVANCED", "F")).toBe("ADVANCED");
		expect(resolveEffectiveExperienceLevel("INTERMEDIATE", "E")).toBe(
			"INTERMEDIATE",
		);
		expect(resolveEffectiveExperienceLevel("BEGINNER", "F")).toBe("BEGINNER");

		// Preserves equal floor
		expect(resolveEffectiveExperienceLevel("NONE", "F")).toBe("NONE");
		expect(resolveEffectiveExperienceLevel("BEGINNER", "E")).toBe("BEGINNER");
	});
});

describe("rebalanced XP helpers", () => {
	it("computes fair completion-based session XP (20-120) and capped streak bonus", () => {
		expect(computeSessionXp(0, 10)).toBe(0);
		expect(computeSessionXp(1, 10)).toBe(20);
		expect(computeSessionXp(5, 10)).toBe(60);
		expect(computeSessionXp(10, 10)).toBe(120);
		expect(computeSessionXp(12, 10)).toBe(120);
		expect(computeSessionXp(4, 0)).toBe(120);
		expect(computeStreakBonusXp(0)).toBe(0);
		expect(computeStreakBonusXp(3)).toBe(30);
		expect(computeStreakBonusXp(5)).toBe(50);
		expect(computeStreakBonusXp(20)).toBe(50);
	});

	it("computes direct mastery XP by clamped difficulty and tier", () => {
		expect(computeMasteryXp(1, "BRONZE")).toBe(50);
		expect(computeMasteryXp(1, "SILVER")).toBe(95);
		expect(computeMasteryXp(1, "GOLD")).toBe(165);

		expect(computeMasteryXp(5, "BRONZE")).toBe(90);
		expect(computeMasteryXp(5, "SILVER")).toBe(155);
		expect(computeMasteryXp(5, "GOLD")).toBe(265);

		expect(computeMasteryXp(10, "BRONZE")).toBe(140);
		expect(computeMasteryXp(10, "SILVER")).toBe(230);
		expect(computeMasteryXp(10, "GOLD")).toBe(390);

		// Clamping and rounding
		expect(computeMasteryXp(-3, "BRONZE")).toBe(50);
		expect(computeMasteryXp(99, "GOLD")).toBe(390);
		expect(computeMasteryXp(4.6, "SILVER")).toBe(155);
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
	it("creates 1 main quest (120 XP workout / 25 XP rest) and 2 deterministic side quests (15 XP)", () => {
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
		expect(q1[0]).toMatchObject({ type: "DAILY", target: 12, xpReward: 120 });
		expect(q1[1].xpReward).toBe(15);
		expect(q1[2].xpReward).toBe(15);
		expect(q1[1].key).not.toBe(q1[2].key);

		const rest = buildDailyQuestTemplates({
			dateKey: "2026-11-19",
			isRestDay: true,
			plannedSetsCount: 0,
		});
		expect(rest[0]).toMatchObject({
			type: "DAILY",
			key: "daily-main",
			target: 1,
			xpReward: 25,
		});
		expect(rest[1].xpReward).toBe(15);
		expect(rest[2].xpReward).toBe(15);
	});
});

describe("buildWeeklyQuestTemplates", () => {
	it("creates 3 weekly quests with 150 XP reward each", () => {
		const weekly = buildWeeklyQuestTemplates({
			scheduledDaysCount: 4,
			plannedWeeklySets: 36,
		});
		expect(weekly).toHaveLength(3);
		expect(weekly.every((q) => q.type === "WEEKLY" && q.xpReward === 150)).toBe(
			true,
		);
		expect(weekly[0]?.target).toBe(4);
		expect(weekly[1]?.target).toBe(36);
		expect(weekly[2]?.target).toBe(3);
	});
});

describe("canManuallyCompleteQuest", () => {
	it("rejects WEEKLY quests unconditionally", () => {
		expect(
			canManuallyCompleteQuest({
				type: "WEEKLY",
				hasNonRestPlannedSession: false,
				isActiveRecoveryQuest: true,
			}),
		).toBe(false);
		expect(
			canManuallyCompleteQuest({
				type: "WEEKLY",
				hasNonRestPlannedSession: true,
				isActiveRecoveryQuest: false,
			}),
		).toBe(false);
	});

	it("allows SIDE quests on both rest and training days", () => {
		expect(
			canManuallyCompleteQuest({
				type: "SIDE",
				hasNonRestPlannedSession: false,
			}),
		).toBe(true);
		expect(
			canManuallyCompleteQuest({
				type: "SIDE",
				hasNonRestPlannedSession: true,
			}),
		).toBe(true);
	});

	it("allows DAILY quests only on rest days with active-recovery shape", () => {
		expect(
			canManuallyCompleteQuest({
				type: "DAILY",
				hasNonRestPlannedSession: true,
				isActiveRecoveryQuest: true,
			}),
		).toBe(false);
		expect(
			canManuallyCompleteQuest({
				type: "DAILY",
				hasNonRestPlannedSession: false,
				isActiveRecoveryQuest: false,
			}),
		).toBe(false);
		expect(
			canManuallyCompleteQuest({
				type: "DAILY",
				hasNonRestPlannedSession: false,
				isActiveRecoveryQuest: true,
			}),
		).toBe(true);
	});
});

describe("deriveLevelProgressFromPersistedStats", () => {
	it("matches evaluateRankProgress inside F-A tiers, on promotion-ready overflow, post-promotion, and in unlimited S tier", () => {
		const cases: Array<{
			totalXp: number;
			mastery: DirectMasterySnapshot;
		}> = [
			{ totalXp: 0, mastery: EMPTY_DIRECT_MASTERY_SNAPSHOT },
			{ totalXp: 125, mastery: EMPTY_DIRECT_MASTERY_SNAPSHOT },
			{ totalXp: 2999, mastery: EMPTY_DIRECT_MASTERY_SNAPSHOT },
			// Banked overflow XP while gated at F-10
			{ totalXp: 3500, mastery: EMPTY_DIRECT_MASTERY_SNAPSHOT },
			// Post-promotion in E-2 with exact same 3500 XP
			{ totalXp: 3500, mastery: FULL_MASTERY },
			// Mid-tier C progression
			{ totalXp: 18500, mastery: FULL_MASTERY },
			// Gated at A-10 with overflow
			{
				totalXp: 70000,
				mastery: {
					bronzeCount: 16,
					silverCount: 8,
					goldCount: 4,
					maxDifficultyMastered: 6,
					masteredPatternsCount: 2,
				},
			},
			// Unlimited S tier
			{ totalXp: 66000, mastery: FULL_MASTERY },
			{ totalXp: 73750, mastery: FULL_MASTERY },
		];

		for (const c of cases) {
			const expected = evaluateRankProgress(c.totalXp, c.mastery);
			const actual = deriveLevelProgressFromPersistedStats({
				totalXp: c.totalXp,
				rankTier: expected.rankTier,
			});

			expect(actual).toEqual({
				...expected,
				promotionGate: null,
			});
		}
	});
});
