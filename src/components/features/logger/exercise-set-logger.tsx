"use client";
import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import type { PlannedExerciseView } from "@/components/features/plan/types";
import { Badge } from "@/components/reui/badge";
import {
	NumberField,
	NumberFieldDecrement,
	NumberFieldGroup,
	NumberFieldIncrement,
	NumberFieldInput,
	NumberFieldScrubArea,
} from "@/components/reui/number-field";
import { Button } from "@/components/ui/button";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemGroup,
	ItemTitle,
} from "@/components/ui/item";
import type { LoggedSetView } from "./types";

export function ExerciseSetLogger({
	plannedExercise,
	loggedSets,
	onLogSet,
}: {
	plannedExercise: PlannedExerciseView;
	loggedSets: LoggedSetView[];
	onLogSet: (input: {
		exerciseId: string;
		setNumber: number;
		reps: number | null;
		seconds: number | null;
	}) => Promise<{ synced: boolean; xpEarned: number }>;
}) {
	const t = useTranslations();
	const isTimed = plannedExercise.exercise.measure === "SECONDS";
	const defaultAmount = isTimed
		? (plannedExercise.targetSeconds ?? 30)
		: (plannedExercise.targetReps ?? 8);

	const [amount, setAmount] = useState<number>(defaultAmount);
	const [submitting, setSubmitting] = useState(false);

	const nextSetNumber = Math.min(10, loggedSets.length + 1);
	const canLogMore = loggedSets.length < 10;

	async function handleLogSet() {
		setSubmitting(true);
		try {
			const res = await onLogSet({
				exerciseId: plannedExercise.exercise.id,
				setNumber: nextSetNumber,
				reps: isTimed ? null : amount,
				seconds: isTimed ? amount : null,
			});

			if (!res.synced) {
				toast.success(t("logger.setSavedOffline"));
			} else if (res.xpEarned > 0) {
				toast.success(t("logger.sessionCompletedToast", { xp: res.xpEarned }));
			} else {
				toast.success(t("logger.setSaved"));
			}
		} catch {
			toast.error(t("common.error"));
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="flex flex-col gap-3">
			{loggedSets.length > 0 && (
				<ItemGroup>
					{loggedSets.map((set) => (
						<Item key={set.id} variant="muted" size="xs">
							<ItemContent>
								<ItemTitle>
									{t("logger.setLabel", { num: set.setNumber })}
								</ItemTitle>
							</ItemContent>
							<ItemActions>
								{set.pending && (
									<Badge variant="warning-light" size="xs">
										{t("logger.setPendingBadge")}
									</Badge>
								)}
								<Badge variant="success-light" size="sm">
									<Check />
									{set.seconds
										? t("logger.loggedSeconds", { sec: set.seconds })
										: t("logger.loggedReps", { reps: set.reps ?? 0 })}
								</Badge>
							</ItemActions>
						</Item>
					))}
				</ItemGroup>
			)}

			{canLogMore && (
				<div className="flex items-end gap-3">
					<NumberField
						className="flex-1"
						min={isTimed ? 5 : 1}
						max={isTimed ? 600 : 100}
						step={isTimed ? 5 : 1}
						value={amount}
						onValueChange={(val) => {
							if (typeof val === "number") setAmount(val);
						}}
					>
						<NumberFieldScrubArea
							label={isTimed ? t("logger.secondsLabel") : t("logger.repsLabel")}
						/>
						<NumberFieldGroup>
							<NumberFieldDecrement />
							<NumberFieldInput />
							<NumberFieldIncrement />
						</NumberFieldGroup>
					</NumberField>

					<Button type="button" disabled={submitting} onClick={handleLogSet}>
						{submitting && <Loader2 className="animate-spin" />}
						{submitting
							? t("logger.loggingSet")
							: t("logger.logSet", { num: nextSetNumber })}
					</Button>
				</div>
			)}
		</div>
	);
}
