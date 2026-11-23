import "server-only";
import { db } from "@/lib/db";
import type { ConsistencyDashboardInput } from "@/lib/metrics/consistency";
import { getLocalDateKey } from "@/server/services/weekly-plan-service";

export async function getConsistencyMetricsData(
	userId: string,
	profile: {
		timezone: string;
		trainingDays: number[];
		sessionMinutes: number;
		createdAt: Date;
	},
): Promise<ConsistencyDashboardInput> {
	const completedLogs = await db.workoutLog.findMany({
		where: { userId, completedAt: { not: null } },
		select: {
			date: true,
			durationSeconds: true,
			plannedSessionId: true,
			_count: {
				select: { sets: true },
			},
		},
		orderBy: { date: "asc" },
	});

	return {
		todayKey: getLocalDateKey(profile.timezone),
		memberSinceKey: getLocalDateKey(profile.timezone, profile.createdAt),
		scheduledDays: profile.trainingDays,
		sessionMinutesTarget: profile.sessionMinutes,
		workouts: completedLogs.map((log) => ({
			dateKey: log.date,
			durationSeconds: log.durationSeconds,
			setsCount: log._count.sets,
			plannedSessionId: log.plannedSessionId,
		})),
	};
}
