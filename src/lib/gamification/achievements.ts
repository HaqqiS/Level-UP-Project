export type AchievementCategory = "consistency" | "volume" | "skill" | "body";

export type AchievementMetricsSnapshot = {
	completedSessionsCount: number;
	completedQuestsCount: number;
	completedWeeklyQuestsCount: number;
	longestStreak: number;
	totalSetsLogged: number;
	skillSetsLogged: number;
	level: number;
	bodyMetricsCount: number;
};

export type AchievementDefinition = {
	key: string;
	title: string;
	description: string;
	category: AchievementCategory;
	xpReward: number;
	isMet: (snapshot: AchievementMetricsSnapshot) => boolean;
};

export const ACHIEVEMENT_CATALOG: readonly AchievementDefinition[] = [
	{
		key: "first-quest",
		title: "First Quest",
		description: "Complete your first quest or workout session.",
		category: "consistency",
		xpReward: 50,
		isMet: (s) => s.completedSessionsCount >= 1 || s.completedQuestsCount >= 1,
	},
	{
		key: "streak-3",
		title: "3-Day Momentum",
		description: "Reach a 3-day scheduled training streak.",
		category: "consistency",
		xpReward: 50,
		isMet: (s) => s.longestStreak >= 3,
	},
	{
		key: "streak-7",
		title: "Unbreakable Week",
		description: "Reach a 7-day scheduled training streak.",
		category: "consistency",
		xpReward: 100,
		isMet: (s) => s.longestStreak >= 7,
	},
	{
		key: "centurion-sets",
		title: "25 Sets Club",
		description: "Log at least 25 workout sets.",
		category: "volume",
		xpReward: 75,
		isMet: (s) => s.totalSetsLogged >= 25,
	},
	{
		key: "level-3",
		title: "Rising Athlete",
		description: "Reach Level 3 through consistent training.",
		category: "consistency",
		xpReward: 75,
		isMet: (s) => s.level >= 3,
	},
	{
		key: "skill-seeker",
		title: "Skill Seeker",
		description: "Log at least 1 set of a SKILL movement.",
		category: "skill",
		xpReward: 50,
		isMet: (s) => s.skillSetsLogged >= 1,
	},
	{
		key: "body-tracker",
		title: "Body Tracker",
		description: "Record at least 2 body metrics entries.",
		category: "body",
		xpReward: 50,
		isMet: (s) => s.bodyMetricsCount >= 2,
	},
	{
		key: "weekly-champion",
		title: "Weekly Champion",
		description: "Complete your first Weekly Quest.",
		category: "consistency",
		xpReward: 100,
		isMet: (s) => s.completedWeeklyQuestsCount >= 1,
	},
];

export function evaluateUnlockedAchievements(
	snapshot: AchievementMetricsSnapshot,
	alreadyUnlockedKeys: ReadonlySet<string>,
): AchievementDefinition[] {
	return ACHIEVEMENT_CATALOG.filter(
		(achievement) =>
			!alreadyUnlockedKeys.has(achievement.key) && achievement.isMet(snapshot),
	);
}
