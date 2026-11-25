import type { ExperienceLevel } from "@/lib/exercises/eligibility";
import type { DirectMasterySnapshot, MasteryTierValue } from "./skill-tree";

export const RANK_TIERS = ["F", "E", "D", "C", "B", "A", "S"] as const;
export type RankTier = (typeof RANK_TIERS)[number];

export const LEVELS_PER_TIER = 10;

export const RANK_TIER_INDEX: Record<RankTier, number> = {
	F: 0,
	E: 1,
	D: 2,
	C: 3,
	B: 4,
	A: 5,
	S: 6,
};

export const TIER_XP_PER_LEVEL: Record<RankTier, number> = {
	F: 300,
	E: 500,
	D: 800,
	C: 1200,
	B: 1600,
	A: 2200,
	S: 2500,
};

export const MIN_EXPERIENCE_BY_RANK: Record<RankTier, ExperienceLevel> = {
	F: "NONE",
	E: "BEGINNER",
	D: "BEGINNER",
	C: "INTERMEDIATE",
	B: "INTERMEDIATE",
	A: "ADVANCED",
	S: "ADVANCED",
};

const EXPERIENCE_LEVEL_ORDER: Record<ExperienceLevel, number> = {
	NONE: 0,
	BEGINNER: 1,
	INTERMEDIATE: 2,
	ADVANCED: 3,
};

/**
 * One-way floor: upgrades experience level upward if the rank tier's minimum
 * floor exceeds `current`, and never downgrades existing experience.
 */
export function resolveEffectiveExperienceLevel(
	current: ExperienceLevel,
	rankTier: RankTier,
): ExperienceLevel {
	const floor = MIN_EXPERIENCE_BY_RANK[rankTier];
	return EXPERIENCE_LEVEL_ORDER[floor] > EXPERIENCE_LEVEL_ORDER[current]
		? floor
		: current;
}

export type PromotionGateRule = {
	fromTier: Exclude<RankTier, "S">;
	toTier: Exclude<RankTier, "F">;
	minBronze: number;
	minSilver: number;
	minGold: number;
	minMaxDifficulty: number;
	minPatterns: number;
};

export const PROMOTION_GATES: Record<
	Exclude<RankTier, "S">,
	PromotionGateRule
> = {
	F: {
		fromTier: "F",
		toTier: "E",
		minBronze: 2,
		minSilver: 0,
		minGold: 0,
		minMaxDifficulty: 0,
		minPatterns: 0,
	},
	E: {
		fromTier: "E",
		toTier: "D",
		minBronze: 5,
		minSilver: 2,
		minGold: 0,
		minMaxDifficulty: 0,
		minPatterns: 0,
	},
	D: {
		fromTier: "D",
		toTier: "C",
		minBronze: 8,
		minSilver: 4,
		minGold: 0,
		minMaxDifficulty: 3,
		minPatterns: 0,
	},
	C: {
		fromTier: "C",
		toTier: "B",
		minBronze: 12,
		minSilver: 6,
		minGold: 2,
		minMaxDifficulty: 5,
		minPatterns: 0,
	},
	B: {
		fromTier: "B",
		toTier: "A",
		minBronze: 16,
		minSilver: 8,
		minGold: 4,
		minMaxDifficulty: 6,
		minPatterns: 0,
	},
	A: {
		fromTier: "A",
		toTier: "S",
		minBronze: 20,
		minSilver: 10,
		minGold: 6,
		minMaxDifficulty: 7,
		minPatterns: 3,
	},
};

export type PromotionGateCriterion = {
	current: number;
	required: number;
	met: boolean;
};

export type PromotionGateStatus = {
	fromTier: Exclude<RankTier, "S">;
	toTier: Exclude<RankTier, "F">;
	allMet: boolean;
	bronze: PromotionGateCriterion;
	silver: PromotionGateCriterion;
	gold: PromotionGateCriterion;
	maxDifficulty: PromotionGateCriterion;
	patterns: PromotionGateCriterion;
};

export const EMPTY_DIRECT_MASTERY_SNAPSHOT: DirectMasterySnapshot = {
	bronzeCount: 0,
	silverCount: 0,
	goldCount: 0,
	maxDifficultyMastered: 0,
	masteredPatternsCount: 0,
};

export function evaluatePromotionGate(
	fromTier: Exclude<RankTier, "S">,
	mastery: DirectMasterySnapshot,
): PromotionGateStatus {
	const rule = PROMOTION_GATES[fromTier];
	const bronze: PromotionGateCriterion = {
		current: mastery.bronzeCount,
		required: rule.minBronze,
		met: mastery.bronzeCount >= rule.minBronze,
	};
	const silver: PromotionGateCriterion = {
		current: mastery.silverCount,
		required: rule.minSilver,
		met: mastery.silverCount >= rule.minSilver,
	};
	const gold: PromotionGateCriterion = {
		current: mastery.goldCount,
		required: rule.minGold,
		met: mastery.goldCount >= rule.minGold,
	};
	const maxDifficulty: PromotionGateCriterion = {
		current: mastery.maxDifficultyMastered,
		required: rule.minMaxDifficulty,
		met: mastery.maxDifficultyMastered >= rule.minMaxDifficulty,
	};
	const patterns: PromotionGateCriterion = {
		current: mastery.masteredPatternsCount,
		required: rule.minPatterns,
		met: mastery.masteredPatternsCount >= rule.minPatterns,
	};

	return {
		fromTier: rule.fromTier,
		toTier: rule.toTier,
		allMet:
			bronze.met && silver.met && gold.met && maxDifficulty.met && patterns.met,
		bronze,
		silver,
		gold,
		maxDifficulty,
		patterns,
	};
}

const TIER_ENTRY_XP: Record<RankTier, number> = {
	F: 0,
	E: 3000,
	D: 8000,
	C: 16000,
	B: 28000,
	A: 44000,
	S: 66000,
};

/** Cumulative XP required to enter level 1 of `tier`. */
export function tierEntryXp(tier: RankTier): number {
	return TIER_ENTRY_XP[tier];
}

export type LevelProgress = {
	level: number;
	rankTier: RankTier;
	tierLevel: number;
	totalXp: number;
	currentLevelXp: number;
	requiredLevelXp: number;
	progressPercent: number;
	overflowXp: number;
	isPromotionReady: boolean;
	nextTier: RankTier | null;
	nextTierEntryXp: number | null;
	promotionGate: PromotionGateStatus | null;
};

/** Cumulative XP threshold required to advance past `globalLevel` to `globalLevel + 1`. */
export function xpThresholdForLevel(globalLevel: number): number {
	const safeLevel = Math.max(1, Math.floor(globalLevel));
	if (safeLevel <= 60) {
		const tierIdx = Math.floor((safeLevel - 1) / LEVELS_PER_TIER);
		const tier = RANK_TIERS[tierIdx];
		const levelInTier = ((safeLevel - 1) % LEVELS_PER_TIER) + 1;
		return tierEntryXp(tier) + levelInTier * TIER_XP_PER_LEVEL[tier];
	}
	return tierEntryXp("S") + (safeLevel - 60) * TIER_XP_PER_LEVEL.S;
}

export function evaluateRankProgress(
	totalXp: number,
	mastery: DirectMasterySnapshot = EMPTY_DIRECT_MASTERY_SNAPSHOT,
): LevelProgress {
	const safeXp = Math.max(0, Math.floor(totalXp));

	for (let idx = 0; idx < RANK_TIERS.length - 1; idx += 1) {
		const tier = RANK_TIERS[idx] as Exclude<RankTier, "S">;
		const entryXp = tierEntryXp(tier);
		const xpPerLevel = TIER_XP_PER_LEVEL[tier];
		const nextTier = RANK_TIERS[idx + 1];
		const nextEntryXp = tierEntryXp(nextTier);
		const gate = evaluatePromotionGate(tier, mastery);

		if (safeXp >= nextEntryXp && gate.allMet) {
			continue;
		}

		if (safeXp >= nextEntryXp && !gate.allMet) {
			return {
				level: idx * LEVELS_PER_TIER + LEVELS_PER_TIER,
				rankTier: tier,
				tierLevel: LEVELS_PER_TIER,
				totalXp: safeXp,
				currentLevelXp: xpPerLevel,
				requiredLevelXp: xpPerLevel,
				progressPercent: 100,
				overflowXp: safeXp - nextEntryXp,
				isPromotionReady: true,
				nextTier,
				nextTierEntryXp: nextEntryXp,
				promotionGate: gate,
			};
		}

		const xpInTier = safeXp - entryXp;
		const tierLevel = Math.min(
			LEVELS_PER_TIER,
			Math.floor(xpInTier / xpPerLevel) + 1,
		);
		const currentLevelXp = xpInTier - (tierLevel - 1) * xpPerLevel;
		const requiredLevelXp = xpPerLevel;
		const progressPercent = Math.min(
			99,
			Math.floor((currentLevelXp / requiredLevelXp) * 100),
		);

		return {
			level: idx * LEVELS_PER_TIER + tierLevel,
			rankTier: tier,
			tierLevel,
			totalXp: safeXp,
			currentLevelXp,
			requiredLevelXp,
			progressPercent,
			overflowXp: 0,
			isPromotionReady: false,
			nextTier,
			nextTierEntryXp: nextEntryXp,
			promotionGate: gate,
		};
	}

	const sEntryXp = tierEntryXp("S");
	const sXpPerLevel = TIER_XP_PER_LEVEL.S;
	const xpInS = safeXp - sEntryXp;
	const tierLevel = Math.floor(xpInS / sXpPerLevel) + 1;
	const currentLevelXp = xpInS % sXpPerLevel;

	return {
		level: 60 + tierLevel,
		rankTier: "S",
		tierLevel,
		totalXp: safeXp,
		currentLevelXp,
		requiredLevelXp: sXpPerLevel,
		progressPercent: Math.min(
			99,
			Math.floor((currentLevelXp / sXpPerLevel) * 100),
		),
		overflowXp: 0,
		isPromotionReady: false,
		nextTier: null,
		nextTierEntryXp: null,
		promotionGate: null,
	};
}

export function getLevelProgress(
	totalXp: number,
	mastery?: DirectMasterySnapshot,
): LevelProgress {
	return evaluateRankProgress(totalXp, mastery);
}

/**
 * Pure read-only derivation of `LevelProgress` from persisted `UserStats`
 * (`totalXp` + `rankTier`) without re-scanning `SetLog` / `MasteryBenchmark`.
 * Matches `evaluateRankProgress` field-for-field for `GamificationBar`
 * (`promotionGate` is `null` since gate criteria are only shown on `/profile`).
 */
export function deriveLevelProgressFromPersistedStats(params: {
	totalXp: number;
	rankTier: RankTier;
}): LevelProgress {
	const safeXp = Math.max(0, Math.floor(params.totalXp));
	const { rankTier } = params;

	if (rankTier === "S") {
		const sEntryXp = tierEntryXp("S");
		const sXpPerLevel = TIER_XP_PER_LEVEL.S;
		const xpInS = Math.max(0, safeXp - sEntryXp);
		const tierLevel = Math.floor(xpInS / sXpPerLevel) + 1;
		const currentLevelXp = xpInS % sXpPerLevel;

		return {
			level: 60 + tierLevel,
			rankTier: "S",
			tierLevel,
			totalXp: safeXp,
			currentLevelXp,
			requiredLevelXp: sXpPerLevel,
			progressPercent: Math.min(
				99,
				Math.floor((currentLevelXp / sXpPerLevel) * 100),
			),
			overflowXp: 0,
			isPromotionReady: false,
			nextTier: null,
			nextTierEntryXp: null,
			promotionGate: null,
		};
	}

	const idx = RANK_TIER_INDEX[rankTier];
	const entryXp = tierEntryXp(rankTier);
	const xpPerLevel = TIER_XP_PER_LEVEL[rankTier];
	const nextTier = RANK_TIERS[idx + 1];
	const nextEntryXp = tierEntryXp(nextTier);

	if (safeXp >= nextEntryXp) {
		return {
			level: idx * LEVELS_PER_TIER + LEVELS_PER_TIER,
			rankTier,
			tierLevel: LEVELS_PER_TIER,
			totalXp: safeXp,
			currentLevelXp: xpPerLevel,
			requiredLevelXp: xpPerLevel,
			progressPercent: 100,
			overflowXp: safeXp - nextEntryXp,
			isPromotionReady: true,
			nextTier,
			nextTierEntryXp: nextEntryXp,
			promotionGate: null,
		};
	}

	const xpInTier = Math.max(0, safeXp - entryXp);
	const tierLevel = Math.min(
		LEVELS_PER_TIER,
		Math.floor(xpInTier / xpPerLevel) + 1,
	);
	const currentLevelXp = xpInTier - (tierLevel - 1) * xpPerLevel;
	const requiredLevelXp = xpPerLevel;
	const progressPercent = Math.min(
		99,
		Math.floor((currentLevelXp / requiredLevelXp) * 100),
	);

	return {
		level: idx * LEVELS_PER_TIER + tierLevel,
		rankTier,
		tierLevel,
		totalXp: safeXp,
		currentLevelXp,
		requiredLevelXp,
		progressPercent,
		overflowXp: 0,
		isPromotionReady: false,
		nextTier,
		nextTierEntryXp: nextEntryXp,
		promotionGate: null,
	};
}

export function computeSessionXp(
	completedSetsCount: number,
	plannedSetsCount: number,
): number {
	if (completedSetsCount <= 0) return 0;
	const ratio =
		plannedSetsCount > 0
			? Math.min(1, completedSetsCount / plannedSetsCount)
			: 1;
	return Math.max(20, Math.round(120 * ratio));
}

export function computeStreakBonusXp(currentStreak: number): number {
	return Math.min(50, Math.max(0, Math.floor(currentStreak)) * 10);
}

export function computeMasteryXp(
	difficulty: number,
	tier: MasteryTierValue,
): number {
	const d = Math.min(10, Math.max(1, Math.round(difficulty)));
	switch (tier) {
		case "BRONZE":
			return 40 + d * 10;
		case "SILVER":
			return 80 + d * 15;
		case "GOLD":
			return 140 + d * 25;
	}
}

function addDaysUtc(dateKey: string, days: number): string {
	const date = new Date(`${dateKey}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

function getDayOfWeekUtc(dateKey: string): number {
	return new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
}

export function getIsoWeekKey(dateKey: string): string {
	const date = new Date(`${dateKey}T00:00:00.000Z`);
	const day = date.getUTCDay();
	const diffToMonday = day === 0 ? -6 : 1 - day;
	date.setUTCDate(date.getUTCDate() + diffToMonday);
	return date.toISOString().slice(0, 10);
}

export type StreakEvaluation = {
	currentStreak: number;
	longestStreak: number;
	freezesAvailable: number;
	freezeWeekKey: string;
	freezeUsedThisWeek: boolean;
	lastFrozenDate: string | null;
	frozenDates: string[];
	lastActiveDate: string | null;
};

/**
 * Deterministically evaluates streak and weekly freeze usage from workout completion dates.
 * Scheduled rest days never break a streak; missed scheduled days consume 1 freeze/ISO week before resetting.
 */
export function evaluateStreakHistory(params: {
	scheduledDays: readonly number[];
	completedDates: Iterable<string>;
	startDateKey: string;
	todayDateKey: string;
}): StreakEvaluation {
	const scheduledSet = new Set(params.scheduledDays);
	const completedSet = new Set(params.completedDates);
	const todayWeekKey = getIsoWeekKey(params.todayDateKey);

	if (completedSet.size === 0) {
		return {
			currentStreak: 0,
			longestStreak: 0,
			freezesAvailable: 1,
			freezeWeekKey: todayWeekKey,
			freezeUsedThisWeek: false,
			lastFrozenDate: null,
			frozenDates: [],
			lastActiveDate: null,
		};
	}

	const sortedCompleted = [...completedSet].sort();
	let firstDate = params.startDateKey;
	if (sortedCompleted[0] < firstDate) {
		firstDate = sortedCompleted[0];
	}

	let currentStreak = 0;
	let longestStreak = 0;
	let freezesAvailable = 1;
	let currentWeekKey = getIsoWeekKey(firstDate);
	let lastFrozenDate: string | null = null;
	const frozenDates: string[] = [];
	let lastActiveDate: string | null = null;

	for (
		let cursor = firstDate;
		cursor <= params.todayDateKey;
		cursor = addDaysUtc(cursor, 1)
	) {
		const weekKey = getIsoWeekKey(cursor);
		if (weekKey !== currentWeekKey) {
			currentWeekKey = weekKey;
			freezesAvailable = 1;
		}

		if (completedSet.has(cursor)) {
			currentStreak += 1;
			if (currentStreak > longestStreak) longestStreak = currentStreak;
			lastActiveDate = cursor;
			continue;
		}

		const isScheduledDay = scheduledSet.has(getDayOfWeekUtc(cursor));
		if (isScheduledDay && cursor < params.todayDateKey && currentStreak > 0) {
			if (freezesAvailable > 0) {
				freezesAvailable -= 1;
				lastFrozenDate = cursor;
				frozenDates.push(cursor);
			} else {
				currentStreak = 0;
			}
		}
	}

	return {
		currentStreak,
		longestStreak,
		freezesAvailable,
		freezeWeekKey: todayWeekKey,
		freezeUsedThisWeek: freezesAvailable === 0,
		lastFrozenDate,
		frozenDates,
		lastActiveDate,
	};
}

export type QuestTemplate = {
	type: "DAILY" | "SIDE" | "WEEKLY";
	key: string;
	title: string;
	target: number;
	xpReward: number;
};

export function buildWeeklyQuestTemplates(params: {
	scheduledDaysCount: number;
	plannedWeeklySets: number;
}): QuestTemplate[] {
	const safeDays = Math.max(1, params.scheduledDaysCount);
	const safeSets = Math.max(10, params.plannedWeeklySets);

	return [
		{
			type: "WEEKLY",
			key: "weekly-sessions",
			title: "Complete scheduled workouts this week",
			target: safeDays,
			xpReward: 150,
		},
		{
			type: "WEEKLY",
			key: "weekly-sets",
			title: "Log target sets this week",
			target: safeSets,
			xpReward: 150,
		},
		{
			type: "WEEKLY",
			key: "weekly-checkin",
			title: "Complete pre-workout check-ins this week",
			target: Math.max(1, Math.min(3, safeDays)),
			xpReward: 150,
		},
	];
}

const SIDE_QUEST_POOL: readonly { key: string; title: string }[] = [
	{ key: "side-mobility", title: "2 min wrist & shoulder mobility" },
	{ key: "side-plank", title: "Hold a 45s hollow or plank" },
	{ key: "side-hydrate", title: "Drink 2L water today" },
	{ key: "side-walk", title: "10 min recovery walk" },
];

export function canManuallyCompleteQuest(params: {
	type: "DAILY" | "SIDE" | "WEEKLY";
	hasNonRestPlannedSession: boolean;
	isActiveRecoveryQuest?: boolean;
}): boolean {
	if (params.type === "SIDE") return true;
	if (params.type === "DAILY") {
		return (
			!params.hasNonRestPlannedSession && (params.isActiveRecoveryQuest ?? true)
		);
	}
	return false;
}

export function buildDailyQuestTemplates(params: {
	dateKey: string;
	isRestDay: boolean;
	sessionFocus?: string | null;
	plannedSetsCount: number;
}): QuestTemplate[] {
	const { dateKey, isRestDay, sessionFocus, plannedSetsCount } = params;
	const mainQuest: QuestTemplate = {
		type: "DAILY",
		key: "daily-main",
		title: isRestDay
			? "Complete active recovery check-in"
			: `Complete today's ${sessionFocus ?? "workout"} session`,
		target: isRestDay ? 1 : Math.max(1, plannedSetsCount),
		xpReward: isRestDay ? 25 : 120,
	};

	let hash = 0;
	for (let i = 0; i < dateKey.length; i++) {
		hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
	}
	const firstIdx = hash % SIDE_QUEST_POOL.length;
	const secondIdx = (firstIdx + 1) % SIDE_QUEST_POOL.length;

	return [
		mainQuest,
		{
			type: "SIDE",
			key: SIDE_QUEST_POOL[firstIdx].key,
			title: SIDE_QUEST_POOL[firstIdx].title,
			target: 1,
			xpReward: 15,
		},
		{
			type: "SIDE",
			key: SIDE_QUEST_POOL[secondIdx].key,
			title: SIDE_QUEST_POOL[secondIdx].title,
			target: 1,
			xpReward: 15,
		},
	];
}
