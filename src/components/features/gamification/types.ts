import type { LevelProgress } from "@/lib/gamification/engine";

export type GamificationSummary = {
	totalXp: number;
	level: number;
	currentStreak: number;
	longestStreak: number;
	freezesAvailable: number;
	freezeWeekKey?: string | null;
	freezeUsedThisWeek?: boolean;
	lastFrozenDate?: string | null;
	levelProgress: LevelProgress;
};

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
	category: "consistency" | "volume" | "skill" | "body";
	xpReward: number;
	unlockedAt: string | null;
};
