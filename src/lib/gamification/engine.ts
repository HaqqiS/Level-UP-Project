export type LevelProgress = {
	level: number;
	totalXp: number;
	currentLevelXp: number;
	requiredLevelXp: number;
	progressPercent: number;
};

/** Cumulative XP threshold required to advance past `level` to `level + 1`. */
export function xpThresholdForLevel(level: number): number {
	const safeLevel = Math.max(1, Math.floor(level));
	return Math.floor(100 * safeLevel ** 1.5);
}

export function getLevelProgress(totalXp: number): LevelProgress {
	const safeXp = Math.max(0, Math.floor(totalXp));
	let level = 1;
	while (safeXp >= xpThresholdForLevel(level)) {
		level += 1;
	}
	const prevThreshold = level === 1 ? 0 : xpThresholdForLevel(level - 1);
	const nextThreshold = xpThresholdForLevel(level);
	const currentLevelXp = safeXp - prevThreshold;
	const requiredLevelXp = Math.max(1, nextThreshold - prevThreshold);
	const progressPercent = Math.min(
		100,
		Math.round((currentLevelXp / requiredLevelXp) * 100),
	);

	return {
		level,
		totalXp: safeXp,
		currentLevelXp,
		requiredLevelXp,
		progressPercent,
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
	return Math.max(10, Math.round(100 * ratio));
}

export function computeStreakBonusXp(currentStreak: number): number {
	return Math.min(50, Math.max(0, Math.floor(currentStreak)) * 5);
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
		lastActiveDate,
	};
}

export type QuestTemplate = {
	type: "DAILY" | "SIDE";
	key: string;
	title: string;
	target: number;
	xpReward: number;
};

const SIDE_QUEST_POOL: readonly { key: string; title: string }[] = [
	{ key: "side-mobility", title: "2 min wrist & shoulder mobility" },
	{ key: "side-plank", title: "Hold a 45s hollow or plank" },
	{ key: "side-hydrate", title: "Drink 2L water today" },
	{ key: "side-walk", title: "10 min recovery walk" },
];

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
		xpReward: 100,
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
			xpReward: 25,
		},
		{
			type: "SIDE",
			key: SIDE_QUEST_POOL[secondIdx].key,
			title: SIDE_QUEST_POOL[secondIdx].title,
			target: 1,
			xpReward: 25,
		},
	];
}
