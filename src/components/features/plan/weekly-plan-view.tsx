"use client";
import { Info, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ExerciseDetailSheet } from "@/components/features/exercises/exercise-detail-sheet";
import type { ExerciseItem } from "@/components/features/exercises/types";
import {
	Alert,
	AlertAction,
	AlertDescription,
	AlertTitle,
} from "@/components/reui/alert";
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
import { Button } from "@/components/ui/button";
import { regenerateFallbackWeeklyPlanAction } from "@/server/actions/plan";
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
	const [retrying, startRetry] = useTransition();
	const [selectedExercise, setSelectedExercise] = useState<ExerciseItem | null>(
		null,
	);
	const todaySession = plan.sessions.find(
		(s) => s.dayOfWeek === todayDayOfWeek,
	);
	const [openItems, setOpenItems] = useState<string[]>(
		todaySession ? [todaySession.id] : [],
	);

	function handleRetryWithAi() {
		startRetry(async () => {
			const result = await regenerateFallbackWeeklyPlanAction();
			if (!result.ok) {
				toast.error(t("today.generateError"));
				return;
			}
			if (result.fallbackUsed) {
				toast.info(t("today.generateFallback"));
			} else {
				toast.success(t("today.generateSuccess"));
			}
		});
	}

	return (
		<div className="flex flex-col gap-4">
			{plan.fallbackUsed && (
				<Alert variant="warning">
					<AlertDescription>{t("plan.fallbackNote")}</AlertDescription>
					<AlertAction>
						<Button
							type="button"
							size="xs"
							variant="outline"
							disabled={retrying}
							onClick={handleRetryWithAi}
						>
							{retrying ? <Loader2 className="animate-spin" /> : <Sparkles />}
							{retrying ? t("plan.retryingAi") : t("plan.retryAiButton")}
						</Button>
					</AlertAction>
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
				value={openItems}
				onValueChange={(value) => setOpenItems(value.map(String))}
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
