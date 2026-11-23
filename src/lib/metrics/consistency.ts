import {
	evaluateStreakHistory,
	getIsoWeekKey,
} from "@/lib/gamification/engine";

export const METRIC_TIMEFRAMES = ["7d", "30d", "90d", "all"] as const;
export type MetricTimeframe = (typeof METRIC_TIMEFRAMES)[number];

export type ConsistencyWorkoutRecord = {
	dateKey: string;
	durationSeconds: number | null;
	setsCount: number;
	plannedSessionId: string | null;
};

export type ConsistencyDashboardInput = {
	todayKey: string;
	memberSinceKey: string;
	scheduledDays: number[];
	sessionMinutesTarget: number;
	workouts: ConsistencyWorkoutRecord[];
};

export type ConsistencyBucket = {
	key: string;
	label: string;
	startDateKey: string;
	endDateKey: string;
	scheduled: number;
	completed: number;
	frozen: number;
	durationMinutes: number;
	targetMinutes: number;
};

export type ConsistencyHeatmapCellStatus =
	| "completed"
	| "frozen"
	| "missed"
	| "rest"
	| "pending"
	| "before_join"
	| "future";

export type ConsistencyHeatmapCell = {
	dateKey: string;
	dayOfWeek: number;
	status: ConsistencyHeatmapCellStatus;
	durationSeconds: number | null;
	setsCount: number;
	isToday: boolean;
};

export type WeekdayAdherenceItem = {
	dayOfWeek: number;
	isScheduled: boolean;
	scheduledDaysCount: number;
	completedCount: number;
	ratePercent: number | null;
};

export type ConsistencyKpiSummary = {
	adherencePercent: number | null;
	adherenceDelta: number | null;
	scheduledSessions: number;
	completedSessions: number;
	completedDelta: number | null;
	sessionsPerWeek: number;
	onScheduleSessions: number;
	bonusSessions: number;
	freezesUsedInPeriod: number;
	totalDurationSeconds: number;
	durationDeltaSeconds: number | null;
	avgDurationSeconds: number | null;
	timedSessionsCount: number;
	sessionMinutesTarget: number;
	currentStreak: number;
	longestStreak: number;
	freezeReady: boolean;
	freezeUsedThisWeek: boolean;
	lastFrozenDate: string | null;
};

export type ConsistencyTimeframeMetrics = {
	timeframe: MetricTimeframe;
	rangeStartKey: string;
	rangeEndKey: string;
	effectiveStartKey: string;
	bucketGranularity: "day" | "week" | "month";
	kpis: ConsistencyKpiSummary;
	buckets: ConsistencyBucket[];
	heatmapCells: ConsistencyHeatmapCell[];
	heatmapWeeksCount: number;
	heatmapClipped: boolean;
	weekdays: WeekdayAdherenceItem[];
	mostConsistentDay: number | null;
	mostMissedDay: number | null;
};

type AggregatedWorkout = {
	dateKey: string;
	durationSeconds: number | null;
	setsCount: number;
	plannedSessionId: string | null;
};

type RangeSummary = {
	scheduledSessions: number;
	completedSessions: number;
	onScheduleSessions: number;
	bonusSessions: number;
	totalDurationSeconds: number;
	timedSessionsCount: number;
	adherencePercent: number | null;
};

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const SHORT_MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
] as const;

function parseUtcDate(dateKey: string): Date {
	return new Date(`${dateKey}T00:00:00.000Z`);
}

function addDaysUtc(dateKey: string, days: number): string {
	const date = parseUtcDate(dateKey);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

function getDayOfWeekUtc(dateKey: string): number {
	return parseUtcDate(dateKey).getUTCDay();
}

function diffDaysUtc(startKey: string, endKey: string): number {
	return Math.round(
		(parseUtcDate(endKey).getTime() - parseUtcDate(startKey).getTime()) /
			86_400_000,
	);
}

function formatDayMonthLabel(dateKey: string): string {
	const [, month, day] = dateKey.split("-");
	return `${day}/${month}`;
}

function formatMonthYearLabel(monthKey: string): string {
	const [yearStr, monthStr] = monthKey.split("-");
	const monthIndex = Math.max(0, Math.min(11, Number(monthStr) - 1));
	return `${SHORT_MONTHS[monthIndex]} ${yearStr.slice(-2)}`;
}

function getMonthEndKey(monthKey: string): string {
	const [yearStr, monthStr] = monthKey.split("-");
	const nextMonthStart = new Date(
		Date.UTC(Number(yearStr), Number(monthStr), 1),
	);
	nextMonthStart.setUTCDate(nextMonthStart.getUTCDate() - 1);
	return nextMonthStart.toISOString().slice(0, 10);
}

function shiftMonthKey(monthKey: string): string {
	const [yearStr, monthStr] = monthKey.split("-");
	const date = new Date(Date.UTC(Number(yearStr), Number(monthStr), 1));
	return date.toISOString().slice(0, 7);
}

function round1(value: number): number {
	return Math.round(value * 10) / 10;
}

function minKey(a: string, b: string): string {
	return a <= b ? a : b;
}

function maxKey(a: string, b: string): string {
	return a >= b ? a : b;
}

export function formatCompactDuration(totalSeconds: number): string {
	const safe = Math.max(0, Math.round(totalSeconds));
	if (safe <= 0) return "0m";
	if (safe < 60) return `${safe}s`;
	const totalMinutes = Math.round(safe / 60);
	if (totalMinutes < 60) return `${totalMinutes}m`;
	const hours = Math.floor(totalMinutes / 60);
	const remMins = totalMinutes % 60;
	return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}

function summarizeRange(params: {
	startKey: string;
	endKey: string;
	todayKey: string;
	workoutMap: ReadonlyMap<string, AggregatedWorkout>;
	scheduledSet: ReadonlySet<number>;
}): RangeSummary {
	const { startKey, endKey, todayKey, workoutMap, scheduledSet } = params;
	if (startKey > endKey) {
		return {
			scheduledSessions: 0,
			completedSessions: 0,
			onScheduleSessions: 0,
			bonusSessions: 0,
			totalDurationSeconds: 0,
			timedSessionsCount: 0,
			adherencePercent: null,
		};
	}

	let scheduledSessions = 0;
	let completedSessions = 0;
	let onScheduleSessions = 0;
	let bonusSessions = 0;
	let totalDurationSeconds = 0;
	let timedSessionsCount = 0;

	for (
		let cursor = startKey;
		cursor <= endKey;
		cursor = addDaysUtc(cursor, 1)
	) {
		const workout = workoutMap.get(cursor);
		const isScheduledDay = scheduledSet.has(getDayOfWeekUtc(cursor));

		if (isScheduledDay && (cursor < todayKey || Boolean(workout))) {
			scheduledSessions += 1;
		}

		if (workout) {
			completedSessions += 1;
			if (isScheduledDay) {
				onScheduleSessions += 1;
			} else {
				bonusSessions += 1;
			}
			if (workout.durationSeconds !== null && workout.durationSeconds > 0) {
				totalDurationSeconds += workout.durationSeconds;
				timedSessionsCount += 1;
			}
		}
	}

	const adherencePercent =
		scheduledSessions > 0
			? Math.min(100, Math.round((completedSessions / scheduledSessions) * 100))
			: completedSessions > 0
				? 100
				: null;

	return {
		scheduledSessions,
		completedSessions,
		onScheduleSessions,
		bonusSessions,
		totalDurationSeconds,
		timedSessionsCount,
		adherencePercent,
	};
}

function computeBucketStats(params: {
	bucketKey: string;
	label: string;
	startDateKey: string;
	endDateKey: string;
	clampStartKey: string;
	todayKey: string;
	sessionMinutesTarget: number;
	workoutMap: ReadonlyMap<string, AggregatedWorkout>;
	frozenSet: ReadonlySet<string>;
	scheduledSet: ReadonlySet<number>;
}): ConsistencyBucket {
	const {
		bucketKey,
		label,
		startDateKey,
		endDateKey,
		clampStartKey,
		todayKey,
		sessionMinutesTarget,
		workoutMap,
		frozenSet,
		scheduledSet,
	} = params;

	const evalStart = maxKey(startDateKey, clampStartKey);
	const evalEnd = minKey(endDateKey, todayKey);

	let scheduled = 0;
	let completed = 0;
	let frozen = 0;
	let durationSeconds = 0;
	let scheduledDaysInSpan = 0;

	if (evalStart <= evalEnd) {
		for (
			let cursor = evalStart;
			cursor <= evalEnd;
			cursor = addDaysUtc(cursor, 1)
		) {
			const workout = workoutMap.get(cursor);
			const isScheduledDay = scheduledSet.has(getDayOfWeekUtc(cursor));

			if (isScheduledDay) {
				scheduledDaysInSpan += 1;
				if (cursor < todayKey || workout !== undefined) {
					scheduled += 1;
				}
			}

			if (workout) {
				completed += 1;
				if (workout.durationSeconds !== null && workout.durationSeconds > 0) {
					durationSeconds += workout.durationSeconds;
				}
			} else if (frozenSet.has(cursor)) {
				frozen += 1;
			}
		}
	}

	return {
		key: bucketKey,
		label,
		startDateKey,
		endDateKey,
		scheduled,
		completed,
		frozen,
		durationMinutes: Math.round(durationSeconds / 60),
		targetMinutes: scheduledDaysInSpan * sessionMinutesTarget,
	};
}

/**
 * Computes Consistency & Adherence metrics deterministically for the selected timeframe.
 */
export function computeConsistencyMetrics(
	input: ConsistencyDashboardInput,
	timeframe: MetricTimeframe,
): ConsistencyTimeframeMetrics {
	const { todayKey, scheduledDays, sessionMinutesTarget } = input;
	const scheduledSet = new Set(scheduledDays);

	const workoutMap = new Map<string, AggregatedWorkout>();
	for (const record of input.workouts) {
		if (record.dateKey > todayKey) continue;
		const existing = workoutMap.get(record.dateKey);
		if (!existing) {
			workoutMap.set(record.dateKey, { ...record });
			continue;
		}
		const prevPos =
			existing.durationSeconds !== null && existing.durationSeconds > 0
				? existing.durationSeconds
				: 0;
		const nextPos =
			record.durationSeconds !== null && record.durationSeconds > 0
				? record.durationSeconds
				: 0;
		const mergedDuration = prevPos + nextPos > 0 ? prevPos + nextPos : null;
		workoutMap.set(record.dateKey, {
			dateKey: record.dateKey,
			durationSeconds: mergedDuration,
			setsCount: existing.setsCount + record.setsCount,
			plannedSessionId: existing.plannedSessionId ?? record.plannedSessionId,
		});
	}

	const sortedWorkoutDates = [...workoutMap.keys()].sort();
	let effectiveMemberSinceKey = minKey(input.memberSinceKey, todayKey);
	if (
		sortedWorkoutDates.length > 0 &&
		sortedWorkoutDates[0] < effectiveMemberSinceKey
	) {
		effectiveMemberSinceKey = sortedWorkoutDates[0];
	}

	const streak = evaluateStreakHistory({
		scheduledDays,
		completedDates: sortedWorkoutDates,
		startDateKey: effectiveMemberSinceKey,
		todayDateKey: todayKey,
	});
	const frozenSet = new Set(streak.frozenDates);

	const windowDays =
		timeframe === "7d"
			? 7
			: timeframe === "30d"
				? 30
				: timeframe === "90d"
					? 90
					: null;

	const rangeStartKey =
		windowDays !== null
			? addDaysUtc(todayKey, -(windowDays - 1))
			: effectiveMemberSinceKey;
	const effectiveStartKey = maxKey(rangeStartKey, effectiveMemberSinceKey);

	const currentSummary = summarizeRange({
		startKey: effectiveStartKey,
		endKey: todayKey,
		todayKey,
		workoutMap,
		scheduledSet,
	});

	let adherenceDelta: number | null = null;
	let completedDelta: number | null = null;
	let durationDeltaSeconds: number | null = null;

	if (windowDays !== null) {
		const prevEndKey = addDaysUtc(rangeStartKey, -1);
		if (effectiveMemberSinceKey <= prevEndKey) {
			const prevRawStartKey = addDaysUtc(rangeStartKey, -windowDays);
			const prevEffectiveStart = maxKey(
				prevRawStartKey,
				effectiveMemberSinceKey,
			);

			const prevSummary = summarizeRange({
				startKey: prevEffectiveStart,
				endKey: prevEndKey,
				todayKey,
				workoutMap,
				scheduledSet,
			});

			adherenceDelta =
				currentSummary.adherencePercent !== null &&
				prevSummary.adherencePercent !== null
					? currentSummary.adherencePercent - prevSummary.adherencePercent
					: null;
			completedDelta =
				currentSummary.completedSessions - prevSummary.completedSessions;
			durationDeltaSeconds =
				currentSummary.totalDurationSeconds - prevSummary.totalDurationSeconds;
		}
	}

	let freezesUsedInPeriod = 0;
	for (const frozenDate of streak.frozenDates) {
		if (frozenDate >= effectiveStartKey && frozenDate <= todayKey) {
			freezesUsedInPeriod += 1;
		}
	}

	const activeSpanDays = Math.max(
		1,
		diffDaysUtc(effectiveStartKey, todayKey) + 1,
	);
	const sessionsPerWeek = round1(
		currentSummary.completedSessions / Math.max(1, activeSpanDays / 7),
	);
	const avgDurationSeconds =
		currentSummary.timedSessionsCount > 0
			? Math.round(
					currentSummary.totalDurationSeconds /
						currentSummary.timedSessionsCount,
				)
			: null;

	const freezeReady = streak.freezesAvailable > 0 && !streak.freezeUsedThisWeek;

	const kpis: ConsistencyKpiSummary = {
		adherencePercent: currentSummary.adherencePercent,
		adherenceDelta,
		scheduledSessions: currentSummary.scheduledSessions,
		completedSessions: currentSummary.completedSessions,
		completedDelta,
		sessionsPerWeek,
		onScheduleSessions: currentSummary.onScheduleSessions,
		bonusSessions: currentSummary.bonusSessions,
		freezesUsedInPeriod,
		totalDurationSeconds: currentSummary.totalDurationSeconds,
		durationDeltaSeconds,
		avgDurationSeconds,
		timedSessionsCount: currentSummary.timedSessionsCount,
		sessionMinutesTarget,
		currentStreak: streak.currentStreak,
		longestStreak: streak.longestStreak,
		freezeReady,
		freezeUsedThisWeek: streak.freezeUsedThisWeek,
		lastFrozenDate: streak.lastFrozenDate,
	};

	// Adaptive buckets
	const buckets: ConsistencyBucket[] = [];
	let bucketGranularity: "day" | "week" | "month" = "week";

	if (timeframe === "7d") {
		bucketGranularity = "day";
		for (
			let cursor = rangeStartKey;
			cursor <= todayKey;
			cursor = addDaysUtc(cursor, 1)
		) {
			const clampForDay =
				effectiveStartKey > cursor ? addDaysUtc(cursor, 1) : cursor;
			buckets.push(
				computeBucketStats({
					bucketKey: cursor,
					label: formatDayMonthLabel(cursor),
					startDateKey: cursor,
					endDateKey: cursor,
					clampStartKey: clampForDay,
					todayKey,
					sessionMinutesTarget,
					workoutMap,
					frozenSet,
					scheduledSet,
				}),
			);
		}
	} else {
		const weekStartFirst = getIsoWeekKey(effectiveStartKey);
		const weekStartLast = getIsoWeekKey(todayKey);
		const totalIsoWeeks =
			Math.round(diffDaysUtc(weekStartFirst, weekStartLast) / 7) + 1;

		if (timeframe === "all" && totalIsoWeeks > 16) {
			bucketGranularity = "month";
			const startMonthKey = effectiveStartKey.slice(0, 7);
			const endMonthKey = todayKey.slice(0, 7);

			for (
				let monthCursor = startMonthKey;
				monthCursor <= endMonthKey;
				monthCursor = shiftMonthKey(monthCursor)
			) {
				const monthStart = `${monthCursor}-01`;
				const monthEnd = getMonthEndKey(monthCursor);
				buckets.push(
					computeBucketStats({
						bucketKey: monthCursor,
						label: formatMonthYearLabel(monthCursor),
						startDateKey: monthStart,
						endDateKey: monthEnd,
						clampStartKey: effectiveStartKey,
						todayKey,
						sessionMinutesTarget,
						workoutMap,
						frozenSet,
						scheduledSet,
					}),
				);
			}
		} else {
			bucketGranularity = "week";
			const bucketStartWeek =
				timeframe === "all"
					? weekStartFirst
					: minKey(getIsoWeekKey(rangeStartKey), weekStartFirst);

			for (
				let weekCursor = bucketStartWeek;
				weekCursor <= weekStartLast;
				weekCursor = addDaysUtc(weekCursor, 7)
			) {
				const weekEnd = addDaysUtc(weekCursor, 6);
				buckets.push(
					computeBucketStats({
						bucketKey: weekCursor,
						label: formatDayMonthLabel(weekCursor),
						startDateKey: weekCursor,
						endDateKey: weekEnd,
						clampStartKey: effectiveStartKey,
						todayKey,
						sessionMinutesTarget,
						workoutMap,
						frozenSet,
						scheduledSet,
					}),
				);
			}
		}
	}

	// Consistency heatmap cells
	const heatmapCells: ConsistencyHeatmapCell[] = [];
	let heatmapWeeksCount = 1;
	let heatmapClipped = false;

	const resolveCellStatus = (dateKey: string): ConsistencyHeatmapCellStatus => {
		if (dateKey > todayKey) return "future";
		if (dateKey < effectiveMemberSinceKey) return "before_join";
		if (workoutMap.has(dateKey)) return "completed";
		if (frozenSet.has(dateKey)) return "frozen";
		if (scheduledSet.has(getDayOfWeekUtc(dateKey))) {
			return dateKey === todayKey ? "pending" : "missed";
		}
		return "rest";
	};

	if (timeframe === "7d") {
		heatmapWeeksCount = 1;
		for (
			let cursor = rangeStartKey;
			cursor <= todayKey;
			cursor = addDaysUtc(cursor, 1)
		) {
			const workout = workoutMap.get(cursor);
			heatmapCells.push({
				dateKey: cursor,
				dayOfWeek: getDayOfWeekUtc(cursor),
				status: resolveCellStatus(cursor),
				durationSeconds: workout?.durationSeconds ?? null,
				setsCount: workout?.setsCount ?? 0,
				isToday: cursor === todayKey,
			});
		}
	} else {
		const lastWeekMonday = getIsoWeekKey(todayKey);
		const gridEnd = addDaysUtc(lastWeekMonday, 6);
		let gridStart =
			timeframe === "30d"
				? getIsoWeekKey(rangeStartKey)
				: getIsoWeekKey(effectiveStartKey);

		const totalGridWeeks =
			Math.round(diffDaysUtc(gridStart, lastWeekMonday) / 7) + 1;

		if ((timeframe === "90d" || timeframe === "all") && totalGridWeeks > 12) {
			gridStart = addDaysUtc(lastWeekMonday, -11 * 7);
			heatmapClipped = effectiveStartKey < gridStart;
			heatmapWeeksCount = 12;
		} else {
			heatmapWeeksCount = Math.max(1, totalGridWeeks);
		}

		for (
			let cursor = gridStart;
			cursor <= gridEnd;
			cursor = addDaysUtc(cursor, 1)
		) {
			const workout = workoutMap.get(cursor);
			heatmapCells.push({
				dateKey: cursor,
				dayOfWeek: getDayOfWeekUtc(cursor),
				status: resolveCellStatus(cursor),
				durationSeconds: workout?.durationSeconds ?? null,
				setsCount: workout?.setsCount ?? 0,
				isToday: cursor === todayKey,
			});
		}
	}

	// Weekday adherence breakdown (Mon..Sun)
	const weekdayScheduledCounts = new Map<number, number>();
	const weekdayCompletedCounts = new Map<number, number>();

	if (effectiveStartKey <= todayKey) {
		for (
			let cursor = effectiveStartKey;
			cursor <= todayKey;
			cursor = addDaysUtc(cursor, 1)
		) {
			const dow = getDayOfWeekUtc(cursor);
			const workout = workoutMap.get(cursor);
			const isScheduledDay = scheduledSet.has(dow);

			if (isScheduledDay && (cursor < todayKey || Boolean(workout))) {
				weekdayScheduledCounts.set(
					dow,
					(weekdayScheduledCounts.get(dow) ?? 0) + 1,
				);
			}
			if (workout) {
				weekdayCompletedCounts.set(
					dow,
					(weekdayCompletedCounts.get(dow) ?? 0) + 1,
				);
			}
		}
	}

	const weekdays: WeekdayAdherenceItem[] = WEEKDAY_ORDER.map((dayOfWeek) => {
		const isScheduled = scheduledSet.has(dayOfWeek);
		const scheduledDaysCount = weekdayScheduledCounts.get(dayOfWeek) ?? 0;
		const completedCount = weekdayCompletedCounts.get(dayOfWeek) ?? 0;
		const ratePercent =
			isScheduled && scheduledDaysCount > 0
				? Math.min(100, Math.round((completedCount / scheduledDaysCount) * 100))
				: null;

		return {
			dayOfWeek,
			isScheduled,
			scheduledDaysCount,
			completedCount,
			ratePercent,
		};
	});

	const consistentCandidates = weekdays
		.filter(
			(w) => w.isScheduled && w.ratePercent !== null && w.completedCount > 0,
		)
		.sort((a, b) => {
			const rateDiff = (b.ratePercent ?? 0) - (a.ratePercent ?? 0);
			if (rateDiff !== 0) return rateDiff;
			return b.completedCount - a.completedCount;
		});
	const mostConsistentDay = consistentCandidates[0]?.dayOfWeek ?? null;

	const missedCandidates = weekdays
		.filter(
			(w) =>
				w.isScheduled &&
				w.scheduledDaysCount > 0 &&
				w.ratePercent !== null &&
				w.ratePercent < 100 &&
				w.dayOfWeek !== mostConsistentDay,
		)
		.sort((a, b) => {
			const rateDiff = (a.ratePercent ?? 0) - (b.ratePercent ?? 0);
			if (rateDiff !== 0) return rateDiff;
			const missedA = a.scheduledDaysCount - a.completedCount;
			const missedB = b.scheduledDaysCount - b.completedCount;
			return missedB - missedA;
		});
	const mostMissedDay = missedCandidates[0]?.dayOfWeek ?? null;

	return {
		timeframe,
		rangeStartKey,
		rangeEndKey: todayKey,
		effectiveStartKey,
		bucketGranularity,
		kpis,
		buckets,
		heatmapCells,
		heatmapWeeksCount,
		heatmapClipped,
		weekdays,
		mostConsistentDay,
		mostMissedDay,
	};
}
