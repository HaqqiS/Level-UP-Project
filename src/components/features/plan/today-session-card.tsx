"use client";
import { Calendar, Coffee, Dumbbell, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ExerciseDetailSheet } from "@/components/features/exercises/exercise-detail-sheet";
import type { ExerciseItem } from "@/components/features/exercises/types";
import { Alert, AlertDescription } from "@/components/reui/alert";
import { Badge } from "@/components/reui/badge";
import { IconTile } from "@/components/reui/icon-tile";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { DailyCheckinSheet } from "./daily-checkin-sheet";
import type { PlannedSessionView } from "./types";

export function TodaySessionCard({
	session,
	allExercises,
	defaultMinutes,
	isCompleted,
	hasStarted,
	onOpenLogger,
	onOpenPlan,
}: {
	session: PlannedSessionView;
	allExercises: readonly ExerciseItem[];
	defaultMinutes: number;
	isCompleted?: boolean;
	hasStarted?: boolean;
	onOpenLogger?: () => void;
	onOpenPlan?: () => void;
}) {
	const t = useTranslations();
	const [selectedExercise, setSelectedExercise] = useState<ExerciseItem | null>(
		null,
	);

	if (session.isRest) {
		return (
			<Card size="sm">
				<CardHeader className="flex flex-row items-center gap-3">
					<IconTile variant="soft">
						<Coffee />
					</IconTile>
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<CardTitle>{t("today.restTitle")}</CardTitle>
							<Badge variant="secondary" size="sm">
								{t("plan.restBadge")}
							</Badge>
						</div>
						<CardDescription>{t("today.restBody")}</CardDescription>
					</div>
				</CardHeader>
				<CardFooter className="flex-col items-stretch gap-2">
					{onOpenPlan ? (
						<Button variant="outline" className="w-full" onClick={onOpenPlan}>
							<Calendar />
							{t("today.viewWeek")}
						</Button>
					) : (
						<Button
							variant="outline"
							className="w-full"
							nativeButton={false}
							render={<Link href="/today?tab=plan" />}
						>
							<Calendar />
							{t("today.viewWeek")}
						</Button>
					)}
				</CardFooter>
			</Card>
		);
	}

	return (
		<>
			<Card size="sm">
				<CardHeader>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<CardTitle>{session.focus}</CardTitle>
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
					{session.notes && <CardDescription>{session.notes}</CardDescription>}
				</CardHeader>

				<CardContent className="space-y-2.5">
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
							className="flex w-full items-center justify-between gap-3 rounded-2xl bg-muted/50 p-3 text-left transition-colors hover:bg-muted/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<div className="flex min-w-0 items-center gap-3">
								<IconTile variant="soft" size="sm">
									<Dumbbell />
								</IconTile>
								<div className="min-w-0">
									<p className="truncate text-sm font-semibold">
										{item.exercise.name}
									</p>
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
						</button>
					))}
				</CardContent>

				<CardFooter className="flex-col items-stretch gap-2">
					{onOpenLogger ? (
						<Button className="w-full" onClick={onOpenLogger}>
							{hasStarted
								? t("today.continueWorkout")
								: t("today.startWorkout")}
						</Button>
					) : (
						<Button
							className="w-full"
							nativeButton={false}
							render={<Link href="/today?tab=log" />}
						>
							{hasStarted
								? t("today.continueWorkout")
								: t("today.startWorkout")}
						</Button>
					)}
					{!session.dailyCheckin && !isCompleted && (
						<DailyCheckinSheet
							sessionId={session.id}
							defaultMinutes={defaultMinutes}
						/>
					)}
				</CardFooter>
			</Card>

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
