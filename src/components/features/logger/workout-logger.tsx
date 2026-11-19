"use client";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import type { PlannedSessionView } from "@/components/features/plan/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert";
import { Badge } from "@/components/reui/badge";
import {
	Frame,
	FrameFooter,
	FrameHeader,
	FrameTitle,
} from "@/components/reui/frame";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { finishWorkoutSessionAction } from "@/server/actions/workout";
import { ExerciseSetLogger } from "./exercise-set-logger";
import type { WorkoutLogView } from "./types";

export function WorkoutLogger({
	session,
	workoutLog,
}: {
	session: PlannedSessionView;
	workoutLog: WorkoutLogView | null;
}) {
	const t = useTranslations();
	const [pending, startTransition] = useTransition();

	const setsByExercise = new Map<string, WorkoutLogView["sets"]>();
	for (const set of workoutLog?.sets ?? []) {
		const list = setsByExercise.get(set.exerciseId) ?? [];
		list.push(set);
		setsByExercise.set(set.exerciseId, list);
	}

	const firstIncomplete = session.exercises.find(
		(ex) => (setsByExercise.get(ex.exercise.id)?.length ?? 0) < ex.sets,
	);
	const nextExpandedId = firstIncomplete?.id ?? session.exercises[0]?.id;
	const [openItems, setOpenItems] = useState<string[]>(
		nextExpandedId ? [nextExpandedId] : [],
	);

	useEffect(() => {
		if (nextExpandedId) {
			setOpenItems([nextExpandedId]);
		}
	}, [nextExpandedId]);

	const isCompleted = Boolean(workoutLog?.completedAt);
	const hasAnySets = (workoutLog?.sets.length ?? 0) > 0;

	function handleFinishSession() {
		if (!workoutLog) return;
		startTransition(async () => {
			const res = await finishWorkoutSessionAction(workoutLog.id);
			if (res.ok) {
				toast.success(t("logger.sessionCompletedToast", { xp: res.xpEarned }));
			} else {
				toast.error(t("common.error"));
			}
		});
	}

	return (
		<div className="flex flex-col gap-4">
			{isCompleted && (
				<Alert variant="success">
					<CheckCircle2 />
					<AlertTitle>{t("logger.completedTitle")}</AlertTitle>
					<AlertDescription>{t("logger.completedBody")}</AlertDescription>
				</Alert>
			)}

			<Frame spacing="sm">
				<FrameHeader>
					<FrameTitle>{session.focus}</FrameTitle>
				</FrameHeader>

				<Accordion
					multiple={false}
					value={openItems}
					onValueChange={(value) => setOpenItems(value.map(String))}
				>
					{session.exercises.map((item) => {
						const loggedSets = setsByExercise.get(item.exercise.id) ?? [];
						const done = loggedSets.length >= item.sets;

						return (
							<AccordionItem key={item.id} value={item.id}>
								<AccordionTrigger>
									<div className="flex flex-wrap items-center gap-2">
										<span>{item.exercise.name}</span>
										<Badge
											variant={done ? "success-light" : "secondary"}
											size="xs"
										>
											{t("logger.setsDoneBadge", {
												done: loggedSets.length,
												target: item.sets,
											})}
										</Badge>
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<ExerciseSetLogger
										plannedExercise={item}
										plannedSessionId={session.id}
										loggedSets={loggedSets}
									/>
								</AccordionContent>
							</AccordionItem>
						);
					})}
				</Accordion>

				{!isCompleted && hasAnySets && workoutLog && (
					<FrameFooter>
						<Button
							variant="secondary"
							className="w-full"
							disabled={pending}
							onClick={handleFinishSession}
						>
							{pending && <Loader2 className="animate-spin" />}
							{pending ? t("logger.finishing") : t("logger.finishEarly")}
						</Button>
					</FrameFooter>
				)}
			</Frame>
		</div>
	);
}
