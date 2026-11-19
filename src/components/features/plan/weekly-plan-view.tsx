"use client";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ExerciseDetailSheet } from "@/components/features/exercises/exercise-detail-sheet";
import type { ExerciseItem } from "@/components/features/exercises/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert";
import { Badge } from "@/components/reui/badge";
import {
	Frame,
	FrameDescription,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@/components/reui/frame";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import type { WeeklyPlanViewData } from "./types";

export function WeeklyPlanView({
	plan,
	todayDayOfWeek,
	allExercises,
}: {
	plan: WeeklyPlanViewData;
	todayDayOfWeek: number;
	allExercises: readonly ExerciseItem[];
}) {
	const t = useTranslations();
	const [selectedExercise, setSelectedExercise] = useState<ExerciseItem | null>(
		null,
	);
	const todaySession = plan.sessions.find(
		(s) => s.dayOfWeek === todayDayOfWeek,
	);

	return (
		<div className="flex flex-col gap-4">
			{plan.fallbackUsed && (
				<Alert variant="warning">
					<AlertDescription>{t("plan.fallbackNote")}</AlertDescription>
				</Alert>
			)}

			{plan.notes && (
				<Alert variant="info">
					<Info />
					<AlertTitle>{t("plan.coachNotes")}</AlertTitle>
					<AlertDescription>{plan.notes}</AlertDescription>
				</Alert>
			)}

			<Accordion
				multiple={false}
				defaultValue={todaySession ? [todaySession.id] : []}
			>
				{plan.sessions.map((session) => {
					const isToday = session.dayOfWeek === todayDayOfWeek;
					const dayLabel = t(
						`onboarding.schedule.dayNames.${session.dayOfWeek}` as "onboarding.schedule.dayNames.0",
					);

					return (
						<AccordionItem key={session.id} value={session.id}>
							<AccordionTrigger>
								<div className="flex flex-wrap items-center gap-2">
									<span>{dayLabel}</span>
									<span className="text-muted-foreground font-normal">
										{session.focus}
									</span>
									{isToday && (
										<Badge variant="primary-light" size="xs">
											{t("plan.todayBadge")}
										</Badge>
									)}
									{session.isRest && (
										<Badge variant="secondary" size="xs">
											{t("plan.restBadge")}
										</Badge>
									)}
									{session.isAdjusted && (
										<Badge variant="info-light" size="xs">
											{t("plan.adjustedBadge")}
										</Badge>
									)}
								</div>
							</AccordionTrigger>
							<AccordionContent>
								{session.isRest ? (
									<p className="text-muted-foreground">
										{session.notes ?? t("today.restBody")}
									</p>
								) : (
									<Frame spacing="xs">
										{session.notes && (
											<FrameHeader>
												<FrameDescription>{session.notes}</FrameDescription>
											</FrameHeader>
										)}
										{session.exercises.map((item) => (
											<button
												key={item.id}
												type="button"
												onClick={() => setSelectedExercise(item.exercise)}
												className="block w-full rounded-(--frame-panel-radius) text-left"
											>
												<FramePanel className="flex items-center justify-between gap-2 transition-colors hover:bg-muted/30">
													<FrameTitle className="truncate">
														{item.exercise.name}
													</FrameTitle>
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
												</FramePanel>
											</button>
										))}
									</Frame>
								)}
							</AccordionContent>
						</AccordionItem>
					);
				})}
			</Accordion>

			<ExerciseDetailSheet
				exercise={selectedExercise}
				allExercises={allExercises}
				onOpenChange={(open) => {
					if (!open) setSelectedExercise(null);
				}}
				onSelectExercise={setSelectedExercise}
			/>
		</div>
	);
}
