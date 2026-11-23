"use client";
import { Calendar, ClipboardCheck, Swords } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { ExerciseItem } from "@/components/features/exercises/types";
import { DailyQuestsCard } from "@/components/features/gamification/daily-quests-card";
import type { QuestItemView } from "@/components/features/gamification/types";
import type { WorkoutLogView } from "@/components/features/logger/types";
import { WorkoutLogger } from "@/components/features/logger/workout-logger";
import type { BodyMapGender } from "@/components/features/muscles/body-map-paths";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneratePlanButton } from "./generate-plan-button";
import {
	MuscleHeatmapCard,
	type MuscleHeatmapModeData,
} from "./muscle-heatmap-card";
import { TodaySessionCard } from "./today-session-card";
import type { PlannedSessionView, WeeklyPlanViewData } from "./types";
import { WeeklyPlanView } from "./weekly-plan-view";

export type TrainTab = "today" | "log" | "plan";

export function TrainHubTabs({
	initialTab,
	todayKey,
	todayDayOfWeek,
	defaultMinutes,
	plan,
	todaySession,
	todayLog,
	allExercises,
	quests,
	weeklyQuests,
	heatmapData,
	bodyMapGender = "male",
}: {
	initialTab: TrainTab;
	todayKey: string;
	todayDayOfWeek: number;
	defaultMinutes: number;
	plan: WeeklyPlanViewData | null;
	todaySession: PlannedSessionView | null;
	todayLog: WorkoutLogView | null;
	allExercises: readonly ExerciseItem[];
	quests: QuestItemView[];
	weeklyQuests: QuestItemView[];
	heatmapData: MuscleHeatmapModeData;
	bodyMapGender?: BodyMapGender;
}) {
	const t = useTranslations();
	const [tab, setTab] = useState<TrainTab>(initialTab);

	useEffect(() => {
		setTab(initialTab);
	}, [initialTab]);

	const isRestDay = todaySession ? todaySession.isRest : true;

	return (
		<Tabs
			value={tab}
			onValueChange={(next) => setTab(String(next) as TrainTab)}
			className="flex flex-col gap-4"
		>
			<TabsList className="w-full">
				<TabsTrigger value="today">{t("trainHub.todayTab")}</TabsTrigger>
				<TabsTrigger value="log">{t("trainHub.logTab")}</TabsTrigger>
				<TabsTrigger value="plan">{t("trainHub.planTab")}</TabsTrigger>
			</TabsList>

			<TabsContent value="today" className="flex flex-col gap-4">
				{!todaySession ? (
					<Card size="sm">
						<CardContent>
							<Empty>
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<Swords />
									</EmptyMedia>
									<EmptyTitle>{t("today.ready")}</EmptyTitle>
									<EmptyDescription>{t("today.comingSoon")}</EmptyDescription>
								</EmptyHeader>
								<EmptyContent>
									<GeneratePlanButton />
								</EmptyContent>
							</Empty>
						</CardContent>
					</Card>
				) : (
					<TodaySessionCard
						session={todaySession}
						allExercises={allExercises}
						defaultMinutes={defaultMinutes}
						isCompleted={Boolean(todayLog?.completedAt)}
						hasStarted={(todayLog?.sets.length ?? 0) > 0}
						onOpenLogger={() => setTab("log")}
						onOpenPlan={() => setTab("plan")}
					/>
				)}

				<DailyQuestsCard
					quests={quests}
					weeklyQuests={weeklyQuests}
					isRestDay={isRestDay}
					onOpenLogger={() => setTab("log")}
				/>

				<MuscleHeatmapCard data={heatmapData} gender={bodyMapGender} />
			</TabsContent>

			<TabsContent value="log" className="flex flex-col gap-4">
				{!todaySession || todaySession.isRest ? (
					<Card size="sm">
						<CardContent>
							<Empty>
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<ClipboardCheck />
									</EmptyMedia>
									<EmptyTitle>{t("logger.noSessionTitle")}</EmptyTitle>
									<EmptyDescription>
										{t("logger.noSessionDescription")}
									</EmptyDescription>
								</EmptyHeader>
								<EmptyContent>
									{!todaySession ? (
										<GeneratePlanButton />
									) : (
										<Button variant="outline" onClick={() => setTab("today")}>
											{t("logger.goToToday")}
										</Button>
									)}
								</EmptyContent>
							</Empty>
						</CardContent>
					</Card>
				) : (
					<WorkoutLogger
						dateKey={todayKey}
						session={todaySession}
						workoutLog={todayLog}
					/>
				)}
			</TabsContent>

			<TabsContent value="plan" className="flex flex-col gap-4">
				{!plan ? (
					<Card size="sm">
						<CardContent>
							<Empty>
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<Calendar />
									</EmptyMedia>
									<EmptyTitle>{t("plan.emptyTitle")}</EmptyTitle>
									<EmptyDescription>
										{t("plan.emptyDescription")}
									</EmptyDescription>
								</EmptyHeader>
								<EmptyContent>
									<GeneratePlanButton />
								</EmptyContent>
							</Empty>
						</CardContent>
					</Card>
				) : (
					<WeeklyPlanView
						plan={plan}
						todayDayOfWeek={todayDayOfWeek}
						allExercises={allExercises}
					/>
				)}
			</TabsContent>
		</Tabs>
	);
}
