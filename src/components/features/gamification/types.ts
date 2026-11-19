import type { LevelProgress } from "@/lib/gamification/engine";

export type GamificationSummary = {
	totalXp: number;
	level: number;
	currentStreak: number;
	longestStreak: number;
	freezesAvailable: number;
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
