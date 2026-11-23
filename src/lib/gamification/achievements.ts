import { RANK_TIER_INDEX, type RankTier } from "./engine";

export type AchievementCategory =
	| "consistency"
	| "volume"
	| "skill"
	| "body"
	| "rank";

export type AchievementMetricsSnapshot = {
	completedSessionsCount: number;
	completedQuestsCount: number;
	completedWeeklyQuestsCount: number;
	longestStreak: number;
	totalSetsLogged: number;
	skillSetsLogged: number;
	level: number;
	bodyMetricsCount: number;
	rankTier: RankTier;
	directBronzeCount: number;
	directSilverCount: number;
	directGoldCount: number;
};

export type AchievementDefinition = {
	key: string;
	title: string;
	description: string;
	category: AchievementCategory;
	xpReward: number;
	titleReward: string;
	isMet: (snapshot: AchievementMetricsSnapshot) => boolean;
};

export const ACHIEVEMENT_CATALOG: readonly AchievementDefinition[] = [
	{
		key: "first-quest",
		title: "First Quest",
		description: "Complete your first quest or workout session.",
		category: "consistency",
		xpReward: 50,
		titleReward: "First Step",
		isMet: (s) => s.completedSessionsCount >= 1 || s.completedQuestsCount >= 1,
	},
	{
		key: "streak-3",
		title: "3-Day Momentum",
		description: "Reach a 3-day scheduled training streak.",
		category: "consistency",
		xpReward: 50,
		titleReward: "Momentum",
		isMet: (s) => s.longestStreak >= 3,
	},
	{
		key: "streak-7",
		title: "Unbreakable Week",
		description: "Reach a 7-day scheduled training streak.",
		category: "consistency",
		xpReward: 100,
		titleReward: "Unbreakable",
		isMet: (s) => s.longestStreak >= 7,
	},
	{
		key: "centurion-sets",
		title: "25 Sets Club",
		description: "Log at least 25 workout sets.",
		category: "volume",
		xpReward: 75,
		titleReward: "Iron Rep",
		isMet: (s) => s.totalSetsLogged >= 25,
	},
	{
		key: "level-3",
		title: "Rising Athlete",
		description: "Reach Level 3 through consistent training.",
		category: "consistency",
		xpReward: 75,
		titleReward: "Rising Athlete",
		isMet: (s) => s.level >= 3,
	},
	{
		key: "skill-seeker",
		title: "Skill Seeker",
		description: "Log at least 1 set of a SKILL movement.",
		category: "skill",
		xpReward: 50,
		titleReward: "Skill Seeker",
		isMet: (s) => s.skillSetsLogged >= 1,
	},
	{
		key: "body-tracker",
		title: "Body Tracker",
		description: "Record at least 2 body metrics entries.",
		category: "body",
		xpReward: 50,
		titleReward: "Self-Aware",
		isMet: (s) => s.bodyMetricsCount >= 2,
	},
	{
		key: "weekly-champion",
		title: "Weekly Champion",
		description: "Complete your first Weekly Quest.",
		category: "consistency",
		xpReward: 100,
		titleReward: "Weekly Champion",
		isMet: (s) => s.completedWeeklyQuestsCount >= 1,
	},
	{
		key: "mastery-bronze",
		title: "Foundation Forged",
		description: "Achieve Bronze direct mastery on any exercise.",
		category: "skill",
		xpReward: 50,
		titleReward: "Foundation Forged",
		isMet: (s) => s.directBronzeCount >= 1,
	},
	{
		key: "mastery-silver",
		title: "Form Craftsman",
		description: "Achieve Silver direct mastery on any exercise.",
		category: "skill",
		xpReward: 100,
		titleReward: "Form Craftsman",
		isMet: (s) => s.directSilverCount >= 1,
	},
	{
		key: "mastery-gold",
		title: "Skill Virtuoso",
		description: "Achieve Gold direct mastery on any exercise.",
		category: "skill",
		xpReward: 150,
		titleReward: "Skill Virtuoso",
		isMet: (s) => s.directGoldCount >= 1,
	},
	{
		key: "rank-e",
		title: "Awakened",
		description: "Promote to Rank E.",
		category: "rank",
		xpReward: 100,
		titleReward: "Awakened",
		isMet: (s) => RANK_TIER_INDEX[s.rankTier] >= RANK_TIER_INDEX.E,
	},
	{
		key: "rank-d",
		title: "Disciplined",
		description: "Promote to Rank D.",
		category: "rank",
		xpReward: 150,
		titleReward: "Disciplined",
		isMet: (s) => RANK_TIER_INDEX[s.rankTier] >= RANK_TIER_INDEX.D,
	},
	{
		key: "rank-c",
		title: "Vanguard",
		description: "Promote to Rank C.",
		category: "rank",
		xpReward: 200,
		titleReward: "Vanguard",
		isMet: (s) => RANK_TIER_INDEX[s.rankTier] >= RANK_TIER_INDEX.C,
	},
	{
		key: "rank-b",
		title: "Ascendant",
		description: "Promote to Rank B.",
		category: "rank",
		xpReward: 250,
		titleReward: "Ascendant",
		isMet: (s) => RANK_TIER_INDEX[s.rankTier] >= RANK_TIER_INDEX.B,
	},
	{
		key: "rank-a",
		title: "Grandmaster",
		description: "Promote to Rank A.",
		category: "rank",
		xpReward: 300,
		titleReward: "Grandmaster",
		isMet: (s) => RANK_TIER_INDEX[s.rankTier] >= RANK_TIER_INDEX.A,
	},
	{
		key: "rank-s",
		title: "Apex Sovereign",
		description: "Ascend to unlimited Rank S.",
		category: "rank",
		xpReward: 500,
		titleReward: "Apex Sovereign",
		isMet: (s) => RANK_TIER_INDEX[s.rankTier] >= RANK_TIER_INDEX.S,
	},
];

export function getAchievementByKey(
	key: string,
): AchievementDefinition | undefined {
	return ACHIEVEMENT_CATALOG.find((achievement) => achievement.key === key);
}

export function getTitleForAchievementKey(
	key: string | null | undefined,
): string | null {
	if (!key) return null;
	return getAchievementByKey(key)?.titleReward ?? null;
}

export function evaluateUnlockedAchievements(
	snapshot: AchievementMetricsSnapshot,
	alreadyUnlockedKeys: ReadonlySet<string>,
): AchievementDefinition[] {
	return ACHIEVEMENT_CATALOG.filter(
		(achievement) =>
			!alreadyUnlockedKeys.has(achievement.key) && achievement.isMet(snapshot),
	);
}
