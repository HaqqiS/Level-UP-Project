"use client";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/reui/badge";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	formatHeatmapDuration,
	type MuscleBreakdownDetail,
} from "@/lib/exercises/muscle-heatmap";
import { MUSCLE_METADATA, type MuscleRole } from "@/lib/exercises/muscles";

function badgeVariantForRole(role: MuscleRole | null) {
	switch (role) {
		case "PRIMARY":
			return "primary-light" as const;
		case "SECONDARY":
			return "secondary" as const;
		case "STABILIZER":
			return "outline" as const;
		default:
			return "secondary" as const;
	}
}

export function MuscleBreakdownSheet({
	detail,
	mode,
	onClose,
}: {
	detail: MuscleBreakdownDetail | null;
	mode: "logged" | "planned";
	onClose: () => void;
}) {
	const t = useTranslations("heatmap");
	const meta = detail ? MUSCLE_METADATA[detail.muscle] : null;

	return (
		<Sheet
			open={detail !== null}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<SheetContent
				side="bottom"
				className="mx-auto max-h-[80dvh] max-w-md overflow-y-auto"
			>
				{detail && meta && (
					<>
						<SheetHeader>
							<div className="flex flex-wrap items-center gap-1.5">
								<Badge variant="outline" size="xs">
									{t(`regions.${meta.region}`)}
								</Badge>
								<Badge
									variant={badgeVariantForRole(detail.highestRole)}
									size="xs"
								>
									{detail.highestRole
										? t(`roles.${detail.highestRole}`)
										: t("untargetedBadge")}
								</Badge>
								{detail.peakActivationWeight > 0 && (
									<Badge variant="info-light" size="xs">
										{detail.peakActivationWeight}%
									</Badge>
								)}
							</div>
							<SheetTitle>{t(`muscles.${detail.muscle}`)}</SheetTitle>
							<SheetDescription>
								{mode === "logged" ? t("loggedMode") : t("plannedMode")}
							</SheetDescription>
						</SheetHeader>

						<div className="space-y-4 px-6 pb-6">
							<div className="grid grid-cols-3 gap-2 text-center">
								<div className="rounded-xl border bg-muted/30 p-2.5">
									<div className="text-[0.68rem] text-muted-foreground">
										{t("effectiveSets")}
									</div>
									<div className="mt-1 text-sm font-semibold tabular-nums">
										{detail.effectiveSets}
									</div>
								</div>
								<div className="rounded-xl border bg-muted/30 p-2.5">
									<div className="text-[0.68rem] text-muted-foreground">
										{t("totalSets")}
									</div>
									<div className="mt-1 text-sm font-semibold tabular-nums">
										{detail.rawSets}
									</div>
								</div>
								<div className="rounded-xl border bg-muted/30 p-2.5">
									<div className="text-[0.68rem] text-muted-foreground">
										{detail.totalHoldSeconds > detail.totalReps
											? t("holdTime")
											: t("totalReps")}
									</div>
									<div className="mt-1 text-sm font-semibold tabular-nums">
										{detail.totalHoldSeconds > detail.totalReps
											? formatHeatmapDuration(detail.totalHoldSeconds)
											: detail.totalReps}
									</div>
								</div>
							</div>

							<div className="space-y-2">
								<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{t("contributingExercises")}
								</h3>
								{detail.contributors.length === 0 ? (
									<p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
										{mode === "logged"
											? t("noContributorsLogged")
											: t("noContributorsPlanned")}
									</p>
								) : (
									<div className="space-y-2">
										{detail.contributors.map((item) => (
											<div
												key={item.exerciseId}
												className="flex items-center justify-between gap-2 rounded-xl border p-3"
											>
												<div className="min-w-0">
													<div className="truncate text-sm font-medium">
														{item.exerciseName}
													</div>
													<div className="text-xs text-muted-foreground">
														{t(`roles.${item.role}`)} · {item.activationWeight}%
													</div>
												</div>
												<div className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
													<div className="font-medium text-foreground">
														{t("contributorSets", { count: item.sets })}
													</div>
													{item.holdSeconds > 0 ? (
														<div>{formatHeatmapDuration(item.holdSeconds)}</div>
													) : (
														<div>
															{t("contributorReps", { count: item.reps })}
														</div>
													)}
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					</>
				)}
			</SheetContent>
		</Sheet>
	);
}
