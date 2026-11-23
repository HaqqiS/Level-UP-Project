"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
	AnatomicalBodyMap,
	MUSCLE_LEGEND_SWATCH_CLASS,
} from "@/components/features/muscles/anatomical-body-map";
import type { BodyMapGender } from "@/components/features/muscles/body-map-paths";
import { Badge } from "@/components/reui/badge";
import {
	Frame,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@/components/reui/frame";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	formatHeatmapDuration,
	type MuscleHeatmapSummary,
} from "@/lib/exercises/muscle-heatmap";
import type { MuscleGroup } from "@/lib/exercises/muscles";
import { MuscleBreakdownSheet } from "./muscle-breakdown-sheet";

export type MuscleHeatmapModeData = {
	logged: {
		today: MuscleHeatmapSummary;
		weekly: MuscleHeatmapSummary;
		thirtyDays: MuscleHeatmapSummary;
	};
	planned: {
		today: MuscleHeatmapSummary;
		weekly: MuscleHeatmapSummary;
	};
};

type HeatmapMode = "logged" | "planned";
type HeatmapScope = "today" | "weekly" | "thirtyDays";

export function MuscleHeatmapCard({
	data,
	gender = "male",
}: {
	data: MuscleHeatmapModeData;
	gender?: BodyMapGender;
}) {
	const t = useTranslations("heatmap");
	const [mode, setMode] = useState<HeatmapMode>("logged");
	const [scope, setScope] = useState<HeatmapScope>("today");
	const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(
		null,
	);

	const effectiveScope: HeatmapScope =
		mode === "planned" && scope === "thirtyDays" ? "weekly" : scope;

	const summary =
		mode === "logged"
			? data.logged[effectiveScope]
			: effectiveScope === "today"
				? data.planned.today
				: data.planned.weekly;

	const selectedDetail = selectedMuscle
		? summary.detailsByMuscle[selectedMuscle]
		: null;
	const hasMusclePills =
		summary.primaryMuscles.length > 0 || summary.secondaryMuscles.length > 0;

	return (
		<>
			<Frame spacing="sm">
				<FrameHeader>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<FrameTitle>
							{mode === "logged" ? t("title") : t("plannedTitle")}
						</FrameTitle>
						<ToggleGroup
							variant="outline"
							size="sm"
							value={[mode]}
							onValueChange={(values) => {
								const next = values[0];
								if (next === "logged" || next === "planned") {
									setMode(next);
									if (next === "planned" && scope === "thirtyDays") {
										setScope("weekly");
									}
								}
							}}
						>
							<ToggleGroupItem value="logged">
								{t("loggedMode")}
							</ToggleGroupItem>
							<ToggleGroupItem value="planned">
								{t("plannedMode")}
							</ToggleGroupItem>
						</ToggleGroup>
					</div>

					<ToggleGroup
						variant="outline"
						size="sm"
						className="w-full pt-1"
						value={[effectiveScope]}
						onValueChange={(values) => {
							const next = values[0];
							if (
								next === "today" ||
								next === "weekly" ||
								(next === "thirtyDays" && mode === "logged")
							) {
								setScope(next);
							}
						}}
					>
						<ToggleGroupItem value="today" className="flex-1">
							{t("todayScope")}
						</ToggleGroupItem>
						<ToggleGroupItem value="weekly" className="flex-1">
							{t("weeklyScope")}
						</ToggleGroupItem>
						{mode === "logged" && (
							<ToggleGroupItem value="thirtyDays" className="flex-1">
								{t("thirtyDaysScope")}
							</ToggleGroupItem>
						)}
					</ToggleGroup>
				</FrameHeader>

				<FramePanel className="space-y-4">
					<div className="grid grid-cols-4 gap-2 text-center">
						<div>
							<p className="text-xs text-muted-foreground">
								{t("totalDuration")}
							</p>
							<p className="text-sm font-semibold tabular-nums">
								{formatHeatmapDuration(summary.stats.totalDurationSeconds)}
							</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground">{t("workouts")}</p>
							<p className="text-sm font-semibold tabular-nums">
								{summary.stats.workoutsCount}
							</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground">{t("totalSets")}</p>
							<p className="text-sm font-semibold tabular-nums">
								{summary.stats.totalSets}
							</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground">{t("totalReps")}</p>
							<p className="text-sm font-semibold tabular-nums">
								{summary.stats.totalReps}
							</p>
						</div>
					</div>

					<div className="space-y-1">
						<AnatomicalBodyMap
							intensityByMuscle={summary.intensityByMuscle}
							selectedMuscle={selectedMuscle}
							onSelectMuscle={setSelectedMuscle}
							gender={gender}
							frontLabel={t("frontLabel")}
							backLabel={t("backLabel")}
							muscleLabel={(m) => t(`muscles.${m}`)}
							intensityLabels={{
								primary: t("primaryLegend"),
								secondary: t("secondaryLegend"),
								untargeted: t("untargetedLegend"),
							}}
						/>
						<p className="text-center text-[0.68rem] text-muted-foreground">
							{hasMusclePills ? t("tapMuscleHint") : t("tapMuscleHintEmpty")}
						</p>
					</div>

					<div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
						<span className="inline-flex items-center gap-1.5">
							<span
								className={`size-2.5 rounded-full ${MUSCLE_LEGEND_SWATCH_CLASS.primary}`}
							/>
							{t("primaryLegend")}
						</span>
						<span className="inline-flex items-center gap-1.5">
							<span
								className={`size-2.5 rounded-full ${MUSCLE_LEGEND_SWATCH_CLASS.secondary}`}
							/>
							{t("secondaryLegend")}
						</span>
						<span className="inline-flex items-center gap-1.5">
							<span
								className={`size-2.5 rounded-full ${MUSCLE_LEGEND_SWATCH_CLASS.untargeted}`}
							/>
							{t("untargetedLegend")}
						</span>
					</div>

					{hasMusclePills && (
						<div className="flex flex-wrap justify-center gap-1.5">
							{summary.primaryMuscles.map((muscle) => (
								<Badge
									key={`p-${muscle}`}
									variant="default"
									size="lg"
									className="min-h-8 cursor-pointer px-2.5 text-xs"
									render={
										<button
											type="button"
											onClick={() => setSelectedMuscle(muscle)}
										/>
									}
								>
									{t(`muscles.${muscle}`)}
								</Badge>
							))}
							{summary.secondaryMuscles.map((muscle) => (
								<Badge
									key={`s-${muscle}`}
									variant="primary-light"
									size="lg"
									className="min-h-8 cursor-pointer px-2.5 text-xs"
									render={
										<button
											type="button"
											onClick={() => setSelectedMuscle(muscle)}
										/>
									}
								>
									{t(`muscles.${muscle}`)}
								</Badge>
							))}
						</div>
					)}
				</FramePanel>
			</Frame>

			<MuscleBreakdownSheet
				detail={selectedDetail}
				mode={mode}
				onClose={() => setSelectedMuscle(null)}
			/>
		</>
	);
}
