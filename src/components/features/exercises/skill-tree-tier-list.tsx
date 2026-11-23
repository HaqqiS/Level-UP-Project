"use client";
import { cn } from "cn";
import { CircleDot, Crown, Lock, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";
import { Badge } from "@/components/reui/badge";
import { IconTile } from "@/components/reui/icon-tile";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { SkillNodeStatus } from "@/lib/gamification/skill-tree";
import type { SkillTreeCanvasLayout } from "@/lib/gamification/skill-tree-layout";
import { CrossPatternPortalChips, TIER_BADGE_CLASS } from "./skill-tree-canvas";
import type { ExerciseItem } from "./types";

function TierListStatusIcon({ status }: { status: SkillNodeStatus }) {
	switch (status) {
		case "mastered":
			return (
				<IconTile variant="solid" size="sm">
					<Crown />
				</IconTile>
			);
		case "ongoing":
			return (
				<IconTile variant="soft" size="sm">
					<CircleDot />
				</IconTile>
			);
		case "locked":
			return (
				<IconTile variant="outline" size="sm">
					<Lock />
				</IconTile>
			);
	}
}

export function SkillTreeTierList({
	layout,
	exercisesById,
	missingEquipmentIds,
	statusFilter,
	focusedExerciseId,
	focusNonce,
	onSelectExercise,
}: {
	layout: SkillTreeCanvasLayout<ExerciseItem>;
	exercisesById: ReadonlyMap<string, ExerciseItem>;
	missingEquipmentIds: ReadonlySet<string>;
	statusFilter: "all" | SkillNodeStatus;
	focusedExerciseId: string | null;
	focusNonce: number;
	onSelectExercise: (exercise: ExerciseItem) => void;
}) {
	const t = useTranslations("exercises");
	const nodeElementsRef = useRef(new Map<string, HTMLDivElement>());

	const sortedTiers = useMemo(
		() => [...layout.nodesByTier].sort((a, b) => a.tier - b.tier),
		[layout.nodesByTier],
	);

	useEffect(() => {
		if (!focusedExerciseId || focusNonce === 0) return;
		const el = nodeElementsRef.current.get(focusedExerciseId);
		if (el && typeof el.scrollIntoView === "function") {
			el.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	}, [focusedExerciseId, focusNonce]);

	return (
		<div className="space-y-4">
			{sortedTiers.map((tierGroup) => {
				const masteredInTier = tierGroup.nodes.filter(
					(node) => node.mastery.status === "mastered",
				).length;

				return (
					<Card key={tierGroup.tier} size="sm">
						<CardHeader className="flex flex-row items-center justify-between gap-2">
							<CardTitle>
								{t("skillTree.tierLabel", { tier: tierGroup.tier })}
							</CardTitle>
							<CardDescription className="text-xs tabular-nums">
								{t("skillTree.patternProgress", {
									mastered: masteredInTier,
									total: tierGroup.nodes.length,
								})}
							</CardDescription>
						</CardHeader>

						<CardContent className="space-y-2">
							{tierGroup.nodes.map((node) => {
								const {
									status,
									highestTier,
									bestSetsInSession,
									targetSets,
									targetValue,
									measure,
									progressPercent,
								} = node.mastery;
								const isMissingEquipment = missingEquipmentIds.has(
									node.exercise.id,
								);
								const isDimmed =
									statusFilter !== "all" && status !== statusFilter;
								const isFocused = focusedExerciseId === node.exercise.id;

								return (
									<div
										key={node.exercise.id}
										ref={(el) => {
											if (el) {
												nodeElementsRef.current.set(node.exercise.id, el);
											} else {
												nodeElementsRef.current.delete(node.exercise.id);
											}
										}}
										className={cn(
											"flex flex-col gap-2 rounded-2xl bg-muted/50 p-3 transition-opacity",
											isDimmed && "opacity-35",
											isFocused &&
												"ring-2 ring-primary ring-offset-1 ring-offset-background",
										)}
									>
										<button
											type="button"
											onClick={() => onSelectExercise(node.exercise)}
											className="flex w-full items-center justify-between gap-3 rounded-lg text-left transition-colors hover:bg-muted/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										>
											<div className="flex min-w-0 flex-1 items-center gap-3">
												<TierListStatusIcon status={status} />
												<div className="min-w-0 flex-1">
													<p className="truncate text-sm font-semibold">
														{node.exercise.name}
													</p>
													<div className="mt-1 flex flex-wrap items-center gap-1.5">
														<Badge variant="outline" size="xs">
															{t("levelBadge", {
																level: node.exercise.difficulty,
															})}
														</Badge>
														<Badge variant="secondary" size="xs">
															{measure === "SECONDS"
																? t("skillTree.benchmarkSeconds", {
																		sets: targetSets,
																		val: targetValue,
																	})
																: t("skillTree.benchmarkReps", {
																		sets: targetSets,
																		val: targetValue,
																	})}
														</Badge>
														<span className="text-xs text-muted-foreground tabular-nums">
															{t("skillTree.setsProgress", {
																done: bestSetsInSession,
																target: targetSets,
															})}
														</span>
														{isMissingEquipment && (
															<Badge
																variant="warning-outline"
																size="xs"
																title={t("skillTree.missingEquipmentHint")}
															>
																<Wrench />
																{t("skillTree.missingEquipmentBadge")}
															</Badge>
														)}
													</div>

													{status === "ongoing" && (
														<div className="mt-1.5 h-1.5 w-full max-w-44 overflow-hidden rounded-full bg-muted">
															<div
																className="h-full rounded-full bg-primary transition-all"
																style={{
																	width: `${Math.max(4, progressPercent)}%`,
																}}
															/>
														</div>
													)}
												</div>
											</div>

											{status === "mastered" && highestTier !== "NONE" ? (
												<Badge
													variant="outline"
													size="sm"
													className={TIER_BADGE_CLASS[highestTier]}
												>
													{t(`skillTree.tiers.${highestTier}`)}
												</Badge>
											) : (
												<Badge
													variant={
														status === "ongoing" ? "primary-light" : "secondary"
													}
													size="sm"
												>
													{t(`skillTree.status.${status}`)}
												</Badge>
											)}
										</button>

										{node.crossPatternPortals.length > 0 && (
											<CrossPatternPortalChips
												portals={node.crossPatternPortals}
												exercisesById={exercisesById}
												onSelectExercise={onSelectExercise}
												className="pl-11"
											/>
										)}
									</div>
								);
							})}
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}
