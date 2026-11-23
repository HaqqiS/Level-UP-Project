"use client";
import {
	Activity,
	ArrowDownUp,
	Flame,
	Footprints,
	ShieldAlert,
	Sparkles,
	Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/reui/badge";
import { IconTile } from "@/components/reui/icon-tile";
import type { MovementPattern } from "@/lib/exercises/eligibility";
import type { ExerciseItem } from "./types";

const PATTERN_ICON: Record<MovementPattern, typeof Flame> = {
	PUSH: Flame,
	PULL: ArrowDownUp,
	LEGS: Footprints,
	CORE: ShieldAlert,
	SKILL: Sparkles,
	MOBILITY: Activity,
};

export function ExerciseCard({
	exercise,
	onSelect,
}: {
	exercise: ExerciseItem;
	onSelect: (exercise: ExerciseItem) => void;
}) {
	const t = useTranslations();
	const Icon = PATTERN_ICON[exercise.pattern] ?? Zap;

	return (
		<button
			type="button"
			onClick={() => onSelect(exercise)}
			className="flex w-full items-center gap-3 rounded-2xl bg-muted/50 p-3 text-left transition-colors hover:bg-muted/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			<IconTile variant="soft" size="sm">
				<Icon />
			</IconTile>
			<div className="min-w-0 flex-1 space-y-1.5">
				<div className="flex flex-wrap items-center gap-1.5">
					<p className="truncate text-sm font-semibold">{exercise.name}</p>
					{exercise.status === "UNVERIFIED" && (
						<Badge variant="warning-light" size="sm">
							{t("exercises.unverifiedBadge")}
						</Badge>
					)}
				</div>
				<p className="line-clamp-1 text-xs text-muted-foreground">
					{exercise.cues[0] ?? ""}
				</p>
				<div className="flex flex-wrap items-center gap-1.5">
					<Badge variant="secondary" size="sm">
						{t("exercises.levelBadge", { level: exercise.difficulty })}
					</Badge>
					<Badge variant="outline" size="sm">
						{exercise.measure === "SECONDS"
							? t("exercises.measureSeconds")
							: t("exercises.measureReps")}
					</Badge>
					{exercise.equipment.map((eq) => (
						<Badge key={eq} variant="outline" size="sm">
							{t(`onboarding.equipment.${eq}` as "onboarding.equipment.none")}
						</Badge>
					))}
				</div>
			</div>
		</button>
	);
}
