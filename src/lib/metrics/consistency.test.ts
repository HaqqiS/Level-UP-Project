import { describe, expect, it } from "vitest";
import {
	computeConsistencyMetrics,
	formatCompactDuration,
} from "./consistency";

describe("formatCompactDuration", () => {
	it("formats zero, seconds, minutes, and hours cleanly", () => {
		expect(formatCompactDuration(0)).toBe("0m");
		expect(formatCompactDuration(-10)).toBe("0m");
		expect(formatCompactDuration(45)).toBe("45s");
		expect(formatCompactDuration(45 * 60)).toBe("45m");
		expect(formatCompactDuration(80 * 60)).toBe("1h 20m");
		expect(formatCompactDuration(120 * 60)).toBe("2h");
	});
});

describe("computeConsistencyMetrics", () => {
	// Scheduled: Mon (1), Wed (3), Fri (5)
	const scheduledDays = [1, 3, 5];

	it("handles empty workout history cleanly", () => {
		// 2026-11-23 is Monday
		const res = computeConsistencyMetrics(
			{
				todayKey: "2026-11-23",
				memberSinceKey: "2026-11-01",
				scheduledDays,
				sessionMinutesTarget: 40,
				workouts: [],
			},
			"30d",
		);

		expect(res.kpis.completedSessions).toBe(0);
		expect(res.kpis.adherencePercent).toBe(0);
		expect(res.kpis.avgDurationSeconds).toBeNull();
		expect(res.kpis.currentStreak).toBe(0);
		expect(res.kpis.adherenceDelta).toBeNull();
		expect(res.kpis.completedDelta).toBeNull();
		expect(res.kpis.durationDeltaSeconds).toBeNull();
		expect(res.buckets.length).toBeGreaterThanOrEqual(4);
		expect(res.heatmapCells.some((c) => c.status === "missed")).toBe(true);
	});

	it("clamps window for new accounts and leaves deltas null", () => {
		// Joined Fri 2026-11-20, today Mon 2026-11-23 -> only Fri is past scheduled
		const res = computeConsistencyMetrics(
			{
				todayKey: "2026-11-23",
				memberSinceKey: "2026-11-20",
				scheduledDays,
				sessionMinutesTarget: 30,
				workouts: [
					{
						dateKey: "2026-11-20",
						durationSeconds: 1800,
						setsCount: 12,
						plannedSessionId: "s1",
					},
				],
			},
			"30d",
		);

		expect(res.effectiveStartKey).toBe("2026-11-20");
		expect(res.kpis.scheduledSessions).toBe(1);
		expect(res.kpis.completedSessions).toBe(1);
		expect(res.kpis.adherencePercent).toBe(100);
		expect(res.kpis.adherenceDelta).toBeNull();
		expect(res.kpis.completedDelta).toBeNull();
		expect(res.kpis.durationDeltaSeconds).toBeNull();
		expect(res.heatmapCells.some((c) => c.status === "before_join")).toBe(true);
	});

	it("marks pending scheduled today without penalizing adherence, and counts once done", () => {
		// 2026-11-23 is Monday (scheduled)
		const base = {
			todayKey: "2026-11-23",
			memberSinceKey: "2026-11-16",
			scheduledDays,
			sessionMinutesTarget: 35,
		};

		const beforeFinish = computeConsistencyMetrics(
			{
				...base,
				workouts: [
					{
						dateKey: "2026-11-16",
						durationSeconds: 2100,
						setsCount: 10,
						plannedSessionId: "s1",
					},
					{
						dateKey: "2026-11-18",
						durationSeconds: 2000,
						setsCount: 10,
						plannedSessionId: "s2",
					},
					{
						dateKey: "2026-11-20",
						durationSeconds: 2200,
						setsCount: 10,
						plannedSessionId: "s3",
					},
				],
			},
			"7d",
		);

		expect(beforeFinish.kpis.scheduledSessions).toBe(2); // Wed 18, Fri 20 inside 7d (17..23)
		expect(beforeFinish.kpis.completedSessions).toBe(2);
		expect(beforeFinish.kpis.adherencePercent).toBe(100);
		expect(
			beforeFinish.heatmapCells.find((c) => c.dateKey === "2026-11-23")?.status,
		).toBe("pending");

		const afterFinish = computeConsistencyMetrics(
			{
				...base,
				workouts: [
					{
						dateKey: "2026-11-16",
						durationSeconds: 2100,
						setsCount: 10,
						plannedSessionId: "s1",
					},
					{
						dateKey: "2026-11-18",
						durationSeconds: 2000,
						setsCount: 10,
						plannedSessionId: "s2",
					},
					{
						dateKey: "2026-11-20",
						durationSeconds: 2200,
						setsCount: 10,
						plannedSessionId: "s3",
					},
					{
						dateKey: "2026-11-23",
						durationSeconds: 2400,
						setsCount: 12,
						plannedSessionId: "s4",
					},
				],
			},
			"7d",
		);

		expect(afterFinish.kpis.scheduledSessions).toBe(3); // Wed 18, Fri 20, Mon 23
		expect(afterFinish.kpis.completedSessions).toBe(3);
		expect(afterFinish.kpis.adherencePercent).toBe(100);
		expect(
			afterFinish.heatmapCells.find((c) => c.dateKey === "2026-11-23")?.status,
		).toBe("completed");
	});

	it("tracks bonus rest-day workouts and caps headline adherence at 100%", () => {
		// Tue 2026-11-17 and Thu 2026-11-19 are rest days
		const res = computeConsistencyMetrics(
			{
				todayKey: "2026-11-22", // Sun
				memberSinceKey: "2026-11-16",
				scheduledDays,
				sessionMinutesTarget: 30,
				workouts: [
					{
						dateKey: "2026-11-16",
						durationSeconds: 1800,
						setsCount: 9,
						plannedSessionId: "s1",
					},
					{
						dateKey: "2026-11-17",
						durationSeconds: 1200,
						setsCount: 6,
						plannedSessionId: null,
					},
					{
						dateKey: "2026-11-18",
						durationSeconds: 1800,
						setsCount: 9,
						plannedSessionId: "s2",
					},
					{
						dateKey: "2026-11-20",
						durationSeconds: 1800,
						setsCount: 9,
						plannedSessionId: "s3",
					},
				],
			},
			"7d",
		);

		expect(res.kpis.scheduledSessions).toBe(3);
		expect(res.kpis.completedSessions).toBe(4);
		expect(res.kpis.onScheduleSessions).toBe(3);
		expect(res.kpis.bonusSessions).toBe(1);
		expect(res.kpis.adherencePercent).toBe(100);
		const tuesday = res.weekdays.find((w) => w.dayOfWeek === 2);
		expect(tuesday?.isScheduled).toBe(false);
		expect(tuesday?.completedCount).toBe(1);
	});

	it("reflects streak freezes from evaluateStreakHistory in KPIs, buckets, and heatmap", () => {
		// Mon 16 done, Wed 18 missed -> freeze used, Fri 20 done
		const res = computeConsistencyMetrics(
			{
				todayKey: "2026-11-21", // Sat
				memberSinceKey: "2026-11-16",
				scheduledDays,
				sessionMinutesTarget: 30,
				workouts: [
					{
						dateKey: "2026-11-16",
						durationSeconds: 1500,
						setsCount: 8,
						plannedSessionId: "s1",
					},
					{
						dateKey: "2026-11-20",
						durationSeconds: 1600,
						setsCount: 8,
						plannedSessionId: "s2",
					},
				],
			},
			"7d",
		);

		expect(res.kpis.currentStreak).toBe(2);
		expect(res.kpis.freezeUsedThisWeek).toBe(true);
		expect(res.kpis.freezeReady).toBe(false);
		expect(res.kpis.freezesUsedInPeriod).toBe(1);
		expect(res.kpis.lastFrozenDate).toBe("2026-11-18");
		expect(
			res.heatmapCells.find((c) => c.dateKey === "2026-11-18")?.status,
		).toBe("frozen");
		expect(res.buckets.find((b) => b.key === "2026-11-18")?.frozen).toBe(1);
	});

	it("computes positive/negative period deltas for 7d/30d and null for all", () => {
		// Current 7d: Nov 16..Nov 22 (Mon 16, Wed 18, Fri 20) -> 3/3 = 100%, 5400s
		// Prev 7d: Nov 9..Nov 15 (Mon 9, Wed 11, Fri 13) -> 1/3 = 33%, 1500s
		const input = {
			todayKey: "2026-11-22",
			memberSinceKey: "2026-11-01",
			scheduledDays,
			sessionMinutesTarget: 30,
			workouts: [
				{
					dateKey: "2026-11-09",
					durationSeconds: 1500,
					setsCount: 8,
					plannedSessionId: "p1",
				},
				{
					dateKey: "2026-11-16",
					durationSeconds: 1800,
					setsCount: 9,
					plannedSessionId: "c1",
				},
				{
					dateKey: "2026-11-18",
					durationSeconds: 1800,
					setsCount: 9,
					plannedSessionId: "c2",
				},
				{
					dateKey: "2026-11-20",
					durationSeconds: 1800,
					setsCount: 9,
					plannedSessionId: "c3",
				},
			],
		};

		const weekRes = computeConsistencyMetrics(input, "7d");
		expect(weekRes.kpis.adherencePercent).toBe(100);
		expect(weekRes.kpis.adherenceDelta).toBe(67); // 100 - 33
		expect(weekRes.kpis.completedDelta).toBe(2); // 3 - 1
		expect(weekRes.kpis.durationDeltaSeconds).toBe(3900); // 5400 - 1500

		const allRes = computeConsistencyMetrics(input, "all");
		expect(allRes.kpis.adherenceDelta).toBeNull();
		expect(allRes.kpis.completedDelta).toBeNull();
		expect(allRes.kpis.durationDeltaSeconds).toBeNull();
	});

	it("switches all-time bucket granularity from week (<=16w) to month (>16w) and clips heatmap at 12w", () => {
		const shortHistory = computeConsistencyMetrics(
			{
				todayKey: "2026-11-23",
				memberSinceKey: "2026-10-01", // ~8 weeks
				scheduledDays,
				sessionMinutesTarget: 30,
				workouts: [
					{
						dateKey: "2026-10-05",
						durationSeconds: 1800,
						setsCount: 8,
						plannedSessionId: "s1",
					},
				],
			},
			"all",
		);
		expect(shortHistory.bucketGranularity).toBe("week");
		expect(shortHistory.heatmapClipped).toBe(false);

		const longHistory = computeConsistencyMetrics(
			{
				todayKey: "2026-11-23",
				memberSinceKey: "2026-06-01", // ~26 weeks (>16w)
				scheduledDays,
				sessionMinutesTarget: 30,
				workouts: [
					{
						dateKey: "2026-06-01",
						durationSeconds: 1800,
						setsCount: 8,
						plannedSessionId: "s1",
					},
				],
			},
			"all",
		);
		expect(longHistory.bucketGranularity).toBe("month");
		expect(longHistory.buckets[0]?.key).toBe("2026-06");
		expect(longHistory.buckets[0]?.label).toBe("Jun 26");
		expect(longHistory.heatmapWeeksCount).toBe(12);
		expect(longHistory.heatmapClipped).toBe(true);
	});

	it("excludes null durations from average duration denominator", () => {
		const res = computeConsistencyMetrics(
			{
				todayKey: "2026-11-22",
				memberSinceKey: "2026-11-16",
				scheduledDays,
				sessionMinutesTarget: 30,
				workouts: [
					{
						dateKey: "2026-11-16",
						durationSeconds: 1800,
						setsCount: 10,
						plannedSessionId: "s1",
					},
					{
						dateKey: "2026-11-18",
						durationSeconds: null,
						setsCount: 8,
						plannedSessionId: "s2",
					},
					{
						dateKey: "2026-11-20",
						durationSeconds: 2400,
						setsCount: 12,
						plannedSessionId: "s3",
					},
				],
			},
			"7d",
		);

		expect(res.kpis.completedSessions).toBe(3);
		expect(res.kpis.timedSessionsCount).toBe(2);
		expect(res.kpis.totalDurationSeconds).toBe(4200);
		expect(res.kpis.avgDurationSeconds).toBe(2100);
	});

	it("identifies mostConsistentDay and mostMissedDay distinctly", () => {
		// 2 weeks: Mon Nov 9, Mon Nov 16 done (2/2 = 100%)
		// Wed Nov 11 done, Wed Nov 18 missed (1/2 = 50%)
		// Fri Nov 13 missed, Fri Nov 20 missed (0/2 = 0%)
		const res = computeConsistencyMetrics(
			{
				todayKey: "2026-11-22",
				memberSinceKey: "2026-11-09",
				scheduledDays,
				sessionMinutesTarget: 30,
				workouts: [
					{
						dateKey: "2026-11-09",
						durationSeconds: 1800,
						setsCount: 10,
						plannedSessionId: "s1",
					},
					{
						dateKey: "2026-11-11",
						durationSeconds: 1800,
						setsCount: 10,
						plannedSessionId: "s2",
					},
					{
						dateKey: "2026-11-16",
						durationSeconds: 1800,
						setsCount: 10,
						plannedSessionId: "s3",
					},
				],
			},
			"30d",
		);

		expect(res.mostConsistentDay).toBe(1); // Monday 100%
		expect(res.mostMissedDay).toBe(5); // Friday 0%
	});
});
