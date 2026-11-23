"use client";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
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
import { useOfflineLogger } from "@/lib/offline/use-offline-logger";
import { ExerciseSetLogger } from "./exercise-set-logger";
import { OfflineSyncBanner } from "./offline-sync-banner";
import type { WorkoutLogView } from "./types";
import { getNextAccordionItemAfterLog } from "./workout-logger-utils";

export function WorkoutLogger({
	dateKey,
	session,
	workoutLog,
}: {
	dateKey: string;
	session: PlannedSessionView;
	workoutLog: WorkoutLogView | null;
}) {
	const t = useTranslations();
	const [finishing, setFinishing] = useState(false);

	const {
		isOnline,
		isSyncing,
		pendingCount,
		mergedSets,
		isCompletedOptimistic,
		logSetOfflineFirst,
		finishSessionOfflineFirst,
		syncNow,
	} = useOfflineLogger({
		dateKey,
		plannedSessionId: session.id,
		serverSets: workoutLog?.sets ?? [],
		serverCompleted: Boolean(workoutLog?.completedAt),
	});

	const setsByExercise = useMemo(() => {
		const map = new Map<string, WorkoutLogView["sets"]>();
		for (const set of mergedSets) {
			const list = map.get(set.exerciseId) ?? [];
			list.push(set);
			map.set(set.exerciseId, list);
		}
		return map;
	}, [mergedSets]);

	const [openItems, setOpenItems] = useState<string[]>(() => {
		const firstIncomplete = session.exercises.find(
			(ex) => (setsByExercise.get(ex.exercise.id)?.length ?? 0) < ex.sets,
		);
		const initialId = firstIncomplete?.id ?? session.exercises[0]?.id;
		return initialId ? [initialId] : [];
	});

	const isCompleted = isCompletedOptimistic;
	const hasAnySets = mergedSets.length > 0;

	async function handleLogSetForItem(
		plannedItem: PlannedSessionView["exercises"][number],
		input: {
			exerciseId: string;
			setNumber: number;
			reps: number | null;
			seconds: number | null;
		},
	) {
		const existingSets = setsByExercise.get(plannedItem.exercise.id) ?? [];
		const previousCount = existingSets.length;
		const nextSetNumbers = new Set(existingSets.map((s) => s.setNumber));
		nextSetNumbers.add(input.setNumber);
		const newCount = nextSetNumbers.size;

		const countsByExerciseId = new Map<string, number>();
		for (const [exerciseId, sets] of setsByExercise.entries()) {
			countsByExerciseId.set(exerciseId, sets.length);
		}

		const nextItemId = getNextAccordionItemAfterLog({
			exercises: session.exercises.map((ex) => ({
				id: ex.id,
				exerciseId: ex.exercise.id,
				sets: ex.sets,
			})),
			loggedPlannedId: plannedItem.id,
			loggedExerciseId: plannedItem.exercise.id,
			previousCount,
			newCount,
			countsByExerciseId,
		});

		const res = await logSetOfflineFirst(input);
		if (nextItemId) {
			setOpenItems([nextItemId]);
		}
		return res;
	}

	async function handleSyncNow() {
		const res = await syncNow();
		if (!res.synced) {
			toast.error(t("offline.syncError"));
		} else if (res.xpEarned > 0) {
			toast.success(t("offline.syncedWithXpToast", { xp: res.xpEarned }));
		} else {
			toast.success(t("offline.syncedToast"));
		}
	}

	async function handleFinishSession() {
		setFinishing(true);
		try {
			const res = await finishSessionOfflineFirst();
			if (!res.synced) {
				toast.success(t("logger.sessionQueuedToast"));
			} else {
				toast.success(t("logger.sessionCompletedToast", { xp: res.xpEarned }));
			}
		} catch {
			toast.error(t("common.error"));
		} finally {
			setFinishing(false);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<OfflineSyncBanner
				isOnline={isOnline}
				isSyncing={isSyncing}
				pendingCount={pendingCount}
				onSyncNow={handleSyncNow}
			/>

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
										loggedSets={loggedSets}
										onLogSet={(input) => handleLogSetForItem(item, input)}
									/>
								</AccordionContent>
							</AccordionItem>
						);
					})}
				</Accordion>

				{!isCompleted && hasAnySets && (
					<FrameFooter>
						<Button
							variant="secondary"
							className="w-full"
							disabled={finishing}
							onClick={handleFinishSession}
						>
							{finishing && <Loader2 className="animate-spin" />}
							{finishing ? t("logger.finishing") : t("logger.finishEarly")}
						</Button>
					</FrameFooter>
				)}
			</Frame>
		</div>
	);
}
