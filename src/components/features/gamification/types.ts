import type { AchievementCategory } from "@/lib/gamification/achievements";
import type { LevelProgress, RankTier } from "@/lib/gamification/engine";

export type GamificationSummary = {
	totalXp: number;
	level: number;
	rankTier: RankTier;
	tierLevel: number;
	equippedTitleKey?: string | null;
	equippedTitle?: string | null;
	currentStreak: number;
	longestStreak: number;
	freezesAvailable: number;
	freezeWeekKey?: string | null;
	freezeUsedThisWeek?: boolean;
	lastFrozenDate?: string | null;
	levelProgress: LevelProgress;
};

/**
 * Picks only plain serializable GamificationSummary fields before crossing
 * the Server Component -> Client Component boundary.
 */
export function toGamificationSummary(
	stats: GamificationSummary,
): GamificationSummary {
	return {
		totalXp: stats.totalXp,
		level: stats.level,
		rankTier: stats.rankTier,
		tierLevel: stats.tierLevel,
		equippedTitleKey: stats.equippedTitleKey ?? null,
		equippedTitle: stats.equippedTitle ?? null,
		currentStreak: stats.currentStreak,
		longestStreak: stats.longestStreak,
		freezesAvailable: stats.freezesAvailable,
		freezeWeekKey: stats.freezeWeekKey ?? null,
		freezeUsedThisWeek: stats.freezeUsedThisWeek ?? false,
		lastFrozenDate: stats.lastFrozenDate ?? null,
		levelProgress: stats.levelProgress,
	};
}

export type QuestItemView = {
	id: string;
	type: "DAILY" | "SIDE" | "WEEKLY";
	key: string;
	title: string;
	target: number;
	progress: number;
	status: "PENDING" | "COMPLETED";
	xpReward: number;
};

export type AchievementItemView = {
	key: string;
	title: string;
	description: string;
	category: AchievementCategory;
	xpReward: number;
	titleReward: string;
	unlockedAt: string | null;
};
