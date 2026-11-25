import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { GamificationBar } from "@/components/features/gamification/gamification-bar";
import { toGamificationSummary } from "@/components/features/gamification/types";
import { resolveBodyMapGender } from "@/components/features/muscles/body-map-paths";
import {
	TrainHubTabs,
	type TrainTab,
} from "@/components/features/plan/train-hub-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOnboarded } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
	computeLoggedMuscleHeatmap,
	computePlannedMuscleHeatmap,
	type HeatmapWorkoutInput,
} from "@/lib/exercises/muscle-heatmap";
import { getIsoWeekKey } from "@/lib/gamification/engine";
import { getTodayGamificationReadModel } from "@/server/services/gamification-service";
import {
	getCachedExerciseCatalog,
	getCurrentWeeklyPlan,
	getLocalDateKey,
} from "@/server/services/weekly-plan-service";
import { getDailyHydrationMlForUser } from "@/server/services/wellness-service";

export const maxDuration = 60;

function normalizeTrainTab(raw?: string): TrainTab {
	if (raw === "log" || raw === "plan") return raw;
	return "today";
}

function addDaysUtcKey(dateKey: string, days: number): string {
	const d = new Date(`${dateKey}T00:00:00.000Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}

async function TodayContent({
	searchParams,
}: {
	searchParams: Promise<{ tab?: string }>;
}) {
	const resolvedParams = await searchParams;
	const initialTab = normalizeTrainTab(resolvedParams.tab);
	const { session, profile } = await requireOnboarded();
	const userId = session.user.id;

	const todayKey = getLocalDateKey(profile.timezone);
	const todayDayOfWeek = new Date(`${todayKey}T00:00:00.000Z`).getUTCDay();
	const weekStartKey = getIsoWeekKey(todayKey);
	const weekEndKey = addDaysUtcKey(weekStartKey, 6);
	const thirtyDaysStartKey = addDaysUtcKey(todayKey, -29);
	const queryStartKey = [thirtyDaysStartKey, weekStartKey].sort()[0];

	const [
		plan,
		allExercises,
		workoutLogs,
		todayHydrationMl,
		existingStats,
		allRelevantQuests,
		completedLogs,
	] = await Promise.all([
		getCurrentWeeklyPlan(userId, profile.timezone),
		getCachedExerciseCatalog(),
		db.workoutLog.findMany({
			where: {
				userId,
				date: { gte: queryStartKey, lte: weekEndKey },
			},
			select: {
				id: true,
				date: true,
				completedAt: true,
				durationSeconds: true,
				sets: {
					orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
					select: {
						id: true,
						exerciseId: true,
						setNumber: true,
						reps: true,
						seconds: true,
						exercise: {
							select: {
								id: true,
								name: true,
								primaryMuscles: true,
								secondaryMuscles: true,
								muscles: {
									select: {
										muscleGroup: true,
										role: true,
										activationWeight: true,
									},
								},
							},
						},
					},
				},
			},
		}),
		getDailyHydrationMlForUser(userId, todayKey),
		db.userStats.findUnique({
			where: { userId },
			select: {
				totalXp: true,
				level: true,
				rankTier: true,
				tierLevel: true,
				equippedTitleKey: true,
				currentStreak: true,
				longestStreak: true,
				freezesAvailable: true,
				freezeWeekKey: true,
				lastActiveDate: true,
			},
		}),
		db.quest.findMany({
			where: {
				userId,
				OR: [
					{ date: todayKey, type: { in: ["DAILY", "SIDE"] } },
					{ date: weekStartKey, type: "WEEKLY" },
				],
			},
			orderBy: [{ type: "asc" }, { createdAt: "asc" }],
			select: {
				id: true,
				type: true,
				key: true,
				title: true,
				target: true,
				progress: true,
				status: true,
				date: true,
				xpReward: true,
			},
		}),
		db.workoutLog.findMany({
			where: { userId, completedAt: { not: null } },
			select: { date: true },
			orderBy: { date: "asc" },
		}),
	]);

	const todaySession =
		plan?.sessions.find((s) => s.dayOfWeek === todayDayOfWeek) ?? null;
	const todayLog = workoutLogs.find((log) => log.date === todayKey) ?? null;

	const { stats, quests, weeklyQuests } = await getTodayGamificationReadModel({
		userId,
		profile,
		plan,
		todayKey,
		todayDayOfWeek,
		todayLog,
		todayHydrationMl,
		existingStats,
		allRelevantQuests,
		completedWorkoutDates: completedLogs.map((l) => l.date),
	});

	const normalizedWorkouts: HeatmapWorkoutInput[] = workoutLogs.map((log) => ({
		date: log.date,
		completed: Boolean(log.completedAt),
		durationSeconds: log.durationSeconds,
		sets: log.sets.map((s) => ({
			exerciseId: s.exercise.id,
			exerciseName: s.exercise.name,
			reps: s.reps,
			seconds: s.seconds,
			muscles: s.exercise.muscles,
			primaryMuscles: s.exercise.primaryMuscles,
			secondaryMuscles: s.exercise.secondaryMuscles,
		})),
	}));

	const todayLogged = computeLoggedMuscleHeatmap({
		workouts: normalizedWorkouts.filter((w) => w.date === todayKey),
	});
	const weeklyLogged = computeLoggedMuscleHeatmap({
		workouts: normalizedWorkouts.filter(
			(w) => w.date >= weekStartKey && w.date <= weekEndKey,
		),
	});
	const thirtyDaysLogged = computeLoggedMuscleHeatmap({
		workouts: normalizedWorkouts.filter(
			(w) => w.date >= thirtyDaysStartKey && w.date <= todayKey,
		),
	});

	const todayPlanned = computePlannedMuscleHeatmap({
		sessions: todaySession
			? [
					{
						isRest: todaySession.isRest,
						exercises: todaySession.exercises.map((item) => ({
							exerciseId: item.exercise.id,
							exerciseName: item.exercise.name,
							sets: item.sets,
							targetReps: item.targetReps,
							targetSeconds: item.targetSeconds,
							restSeconds: item.restSeconds,
							muscles: item.exercise.muscles,
							primaryMuscles: item.exercise.primaryMuscles,
							secondaryMuscles: item.exercise.secondaryMuscles,
						})),
					},
				]
			: [],
	});

	const weeklyPlanned = computePlannedMuscleHeatmap({
		sessions: plan
			? plan.sessions.map((s) => ({
					isRest: s.isRest,
					exercises: s.exercises.map((item) => ({
						exerciseId: item.exercise.id,
						exerciseName: item.exercise.name,
						sets: item.sets,
						targetReps: item.targetReps,
						targetSeconds: item.targetSeconds,
						restSeconds: item.restSeconds,
						muscles: item.exercise.muscles,
						primaryMuscles: item.exercise.primaryMuscles,
						secondaryMuscles: item.exercise.secondaryMuscles,
					})),
				}))
			: [],
	});

	return (
		<>
			<GamificationBar stats={toGamificationSummary(stats)} />
			<TrainHubTabs
				initialTab={initialTab}
				bodyMapGender={resolveBodyMapGender(profile.sex)}
				todayKey={todayKey}
				todayDayOfWeek={todayDayOfWeek}
				defaultMinutes={profile.sessionMinutes}
				plan={plan}
				todaySession={todaySession}
				todayLog={
					todayLog
						? {
								id: todayLog.id,
								date: todayLog.date,
								completedAt: todayLog.completedAt
									? todayLog.completedAt.toISOString()
									: null,
								sets: todayLog.sets.map((s) => ({
									id: s.id,
									exerciseId: s.exerciseId,
									setNumber: s.setNumber,
									reps: s.reps,
									seconds: s.seconds,
								})),
							}
						: null
				}
				allExercises={allExercises}
				quests={quests}
				weeklyQuests={weeklyQuests}
				todayHydrationMl={todayHydrationMl}
				heatmapData={{
					logged: {
						today: todayLogged,
						weekly: weeklyLogged,
						thirtyDays: thirtyDaysLogged,
					},
					planned: {
						today: todayPlanned,
						weekly: weeklyPlanned,
					},
				}}
			/>
		</>
	);
}

export default async function TodayPage({
	searchParams,
}: {
	searchParams: Promise<{ tab?: string }>;
}) {
	const t = await getTranslations("trainHub");
	return (
		<main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
			<h1 className="font-semibold">{t("title")}</h1>
			<Suspense
				fallback={
					<div className="flex flex-col gap-4">
						<Card size="sm">
							<CardContent className="flex flex-col gap-3">
								<div className="flex items-center justify-between gap-2">
									<Skeleton className="h-5 w-32" />
									<Skeleton className="h-5 w-20" />
								</div>
								<Skeleton className="h-3 w-full" />
								<Skeleton className="h-14 w-full" />
							</CardContent>
						</Card>
						<Card size="sm">
							<CardContent className="flex flex-col gap-3">
								<Skeleton className="h-5 w-40" />
								<Skeleton className="h-24 w-full" />
							</CardContent>
						</Card>
					</div>
				}
			>
				<TodayContent searchParams={searchParams} />
			</Suspense>
		</main>
	);
}
