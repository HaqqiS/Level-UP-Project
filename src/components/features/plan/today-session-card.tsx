"use client";
import { Calendar, Coffee, Dumbbell, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ExerciseDetailSheet } from "@/components/features/exercises/exercise-detail-sheet";
import type { ExerciseItem } from "@/components/features/exercises/types";
import { Alert, AlertDescription } from "@/components/reui/alert";
import { Badge } from "@/components/reui/badge";
import {
	Frame,
	FrameDescription,
	FrameFooter,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@/components/reui/frame";
import { IconTile } from "@/components/reui/icon-tile";
import { Button } from "@/components/ui/button";
import { DailyCheckinSheet } from "./daily-checkin-sheet";
import type { PlannedSessionView } from "./types";

export function TodaySessionCard({
	session,
	allExercises,
	defaultMinutes,
	isCompleted,
	hasStarted,
}: {
	session: PlannedSessionView;
	allExercises: readonly ExerciseItem[];
	defaultMinutes: number;
	isCompleted?: boolean;
	hasStarted?: boolean;
}) {
	const t = useTranslations();
	const [selectedExercise, setSelectedExercise] = useState<ExerciseItem | null>(
		null,
	);

	if (session.isRest) {
		return (
			<Frame>
				<FramePanel className="flex items-start gap-3">
					<IconTile variant="soft">
						<Coffee />
					</IconTile>
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<FrameTitle>{t("today.restTitle")}</FrameTitle>
							<Badge variant="secondary" size="sm">
								{t("plan.restBadge")}
							</Badge>
						</div>
						<FrameDescription>{t("today.restBody")}</FrameDescription>
					</div>
				</FramePanel>
				<FrameFooter>
					<Button
						variant="outline"
						className="w-full"
						nativeButton={false}
						render={<Link href="/plan" />}
					>
						<Calendar />
						{t("today.viewWeek")}
					</Button>
				</FrameFooter>
			</Frame>
		);
	}

	return (
		<>
			<Frame spacing="sm">
				<FrameHeader>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<FrameTitle>{session.focus}</FrameTitle>
						<div className="flex items-center gap-1.5">
							{isCompleted && (
								<Badge variant="success-light" size="sm">
									{t("today.completedBadge")}
								</Badge>
							)}
							{session.isAdjusted && (
								<Badge variant="info-light" size="sm">
									{t("today.adjustedBadge")}
								</Badge>
							)}
							{!session.isAdjusted && session.dailyCheckin && (
								<Badge variant="secondary" size="sm">
									{t("checkin.checkedInBadge")}
								</Badge>
							)}
						</div>
					</div>
					{session.notes && (
						<FrameDescription>{session.notes}</FrameDescription>
					)}
				</FrameHeader>

				{session.dailyCheckin?.aiNote && (
					<Alert variant="info">
						<Sparkles />
						<AlertDescription>{session.dailyCheckin.aiNote}</AlertDescription>
					</Alert>
				)}

				{session.dailyCheckin?.fallbackUsed && (
					<Alert variant="warning">
						<AlertDescription>{t("checkin.fallback")}</AlertDescription>
					</Alert>
				)}

				{session.exercises.map((item) => (
					<button
						key={item.id}
						type="button"
						onClick={() => setSelectedExercise(item.exercise)}
						className="block w-full rounded-(--frame-panel-radius) text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
					>
						<FramePanel className="flex items-center justify-between gap-3 transition-colors hover:bg-muted/30">
							<div className="flex min-w-0 items-center gap-3">
								<IconTile variant="soft" size="sm">
									<Dumbbell />
								</IconTile>
								<div className="min-w-0">
									<FrameTitle className="truncate">
										{item.exercise.name}
									</FrameTitle>
									<div className="mt-1 flex flex-wrap gap-1.5">
										<Badge variant="secondary" size="sm">
											{item.targetSeconds
												? t("today.setsSeconds", {
														sets: item.sets,
														sec: item.targetSeconds,
													})
												: t("today.setsReps", {
														sets: item.sets,
														reps: item.targetReps ?? 8,
													})}
										</Badge>
										<Badge variant="outline" size="sm">
											{t("today.restSeconds", { sec: item.restSeconds })}
										</Badge>
										{item.exercise.status === "UNVERIFIED" && (
											<Badge variant="warning-light" size="sm">
												{t("exercises.unverifiedBadge")}
											</Badge>
										)}
									</div>
								</div>
							</div>
						</FramePanel>
					</button>
				))}

				<FrameFooter>
					<Button
						className="w-full"
						nativeButton={false}
						render={<Link href="/log" />}
					>
						{hasStarted ? t("today.continueWorkout") : t("today.startWorkout")}
					</Button>
					{!session.dailyCheckin && !isCompleted && (
						<DailyCheckinSheet
							sessionId={session.id}
							defaultMinutes={defaultMinutes}
						/>
					)}
				</FrameFooter>
			</Frame>

			<ExerciseDetailSheet
				exercise={selectedExercise}
				allExercises={allExercises}
				onOpenChange={(open) => {
					if (!open) setSelectedExercise(null);
				}}
				onSelectExercise={setSelectedExercise}
			/>
		</>
	);
}
