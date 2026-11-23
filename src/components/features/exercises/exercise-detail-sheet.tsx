"use client";
import {
	Check,
	ChevronRight,
	ExternalLink,
	Lock,
	TriangleAlert,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert";
import { Badge } from "@/components/reui/badge";
import { Frame, FramePanel } from "@/components/reui/frame";
import {
	Timeline,
	TimelineContent,
	TimelineHeader,
	TimelineIndicator,
	TimelineItem,
	TimelineSeparator,
	TimelineTitle,
} from "@/components/reui/timeline";
import {
	Progress,
	ProgressLabel,
	ProgressValue,
} from "@/components/ui/progress";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { buildProgressionChain } from "@/lib/exercises/eligibility";
import { computeExerciseMuscleMap } from "@/lib/exercises/muscle-heatmap";
import { normalizeMuscleGroupId } from "@/lib/exercises/muscles";
import type {
	MasteryTierValue,
	SkillEdgeRequirement,
	SkillNodeProgress,
	SkillTreeEdgeInput,
	TierProgressItem,
} from "@/lib/gamification/skill-tree";
import { AnatomicalBodyMap } from "../muscles/anatomical-body-map";
import type { BodyMapGender } from "../muscles/body-map-paths";
import type { ExerciseItem } from "./types";

const TIER_BADGE_CLASS: Record<MasteryTierValue, string> = {
	BRONZE:
		"border-amber-700/30 bg-amber-700/10 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300",
	SILVER:
		"border-slate-400/40 bg-slate-400/15 text-slate-700 dark:border-slate-300/30 dark:bg-slate-300/15 dark:text-slate-200",
	GOLD: "border-yellow-500/40 bg-yellow-500/15 text-yellow-800 dark:border-yellow-400/35 dark:bg-yellow-400/15 dark:text-yellow-300",
};

type TierDisplayState = "implied" | "achieved" | "inProgress" | "locked";

function getTierDisplayState(
	tier: TierProgressItem,
	nodeStatus: SkillNodeProgress["status"],
	prevTierAchieved: boolean,
): TierDisplayState {
	if (tier.implied) return "implied";
	if (tier.achieved) return "achieved";
	if (nodeStatus === "locked") return "locked";
	if (
		tier.tier === "BRONZE" ||
		prevTierAchieved ||
		tier.progressPercent > 0 ||
		tier.bestSetsInSession > 0
	) {
		return "inProgress";
	}
	return "locked";
}

function buildFallbackEdgeRequirements(
	exercise: ExerciseItem,
	edges: readonly SkillTreeEdgeInput[],
	exercisesById: ReadonlyMap<string, ExerciseItem>,
	direction: "incoming" | "outgoing",
): SkillEdgeRequirement[] {
	const items: SkillEdgeRequirement[] = [];
	for (const edge of edges) {
		const isMatch =
			direction === "incoming"
				? edge.toExerciseId === exercise.id
				: edge.fromExerciseId === exercise.id;
		if (!isMatch) continue;

		const peerId =
			direction === "incoming" ? edge.fromExerciseId : edge.toExerciseId;
		const peer = exercisesById.get(peerId);
		if (!peer) continue;

		items.push({
			edgeId: edge.id,
			exerciseId: peer.id,
			exerciseName: peer.name,
			exercisePattern: peer.pattern,
			kind: edge.kind,
			branchLabel: edge.branchLabel,
			requiredTier: edge.requiredTier,
			currentTier: "NONE",
			isMet: false,
			isCrossPattern: peer.pattern !== exercise.pattern,
		});
	}
	return items;
}

export function ExerciseDetailSheet({
	exercise,
	allExercises,
	masteryByExerciseId,
	edges,
	bodyMapGender = "male",
	onOpenChange,
	onSelectExercise,
}: {
	exercise: ExerciseItem | null;
	allExercises: readonly ExerciseItem[];
	masteryByExerciseId?: Record<string, SkillNodeProgress>;
	edges?: readonly SkillTreeEdgeInput[];
	bodyMapGender?: BodyMapGender;
	onOpenChange: (open: boolean) => void;
	onSelectExercise: (exercise: ExerciseItem) => void;
}) {
	const t = useTranslations();

	if (!exercise) return null;

	const exercisesById = new Map(allExercises.map((item) => [item.id, item]));
	const chain = buildProgressionChain(exercise.id, allExercises);
	const activeIndex = chain.findIndex((item) => item.id === exercise.id);
	const mastery = masteryByExerciseId?.[exercise.id] ?? null;
	const hasLegacyTiers = Boolean(mastery?.tiers && mastery.tiers.length > 0);

	const incomingRequirements = mastery
		? mastery.incomingRequirements
		: edges && edges.length > 0
			? buildFallbackEdgeRequirements(
					exercise,
					edges,
					exercisesById,
					"incoming",
				)
			: [];
	const outgoingUnlocks = mastery
		? mastery.outgoingUnlocks
		: edges && edges.length > 0
			? buildFallbackEdgeRequirements(
					exercise,
					edges,
					exercisesById,
					"outgoing",
				)
			: [];
	const hasDagConnections =
		incomingRequirements.length > 0 || outgoingUnlocks.length > 0;

	return (
		<Sheet open={Boolean(exercise)} onOpenChange={onOpenChange}>
			<SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
				<SheetHeader>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="secondary">
							{t(`exercises.patterns.${exercise.pattern}`)}
						</Badge>
						<Badge variant="outline">
							{t("exercises.levelBadge", { level: exercise.difficulty })}
						</Badge>
						{mastery && (
							<Badge
								variant={
									mastery.status === "mastered"
										? "success-light"
										: mastery.status === "ongoing"
											? "primary-light"
											: "secondary"
								}
							>
								{t(`exercises.skillTree.status.${mastery.status}`)}
							</Badge>
						)}
						{mastery && mastery.highestTier !== "NONE" && (
							<Badge
								variant="outline"
								className={TIER_BADGE_CLASS[mastery.highestTier]}
							>
								{t(`exercises.skillTree.tiers.${mastery.highestTier}`)}
							</Badge>
						)}
						{exercise.status === "UNVERIFIED" && (
							<Badge variant="warning-light">
								{t("exercises.unverifiedBadge")}
							</Badge>
						)}
					</div>
					<SheetTitle>{exercise.name}</SheetTitle>
					<SheetDescription>
						{exercise.equipment
							.map((eq) =>
								t(`onboarding.equipment.${eq}` as "onboarding.equipment.none"),
							)
							.join(" · ")}
					</SheetDescription>
				</SheetHeader>

				<div className="flex flex-col gap-5 px-6 pb-6">
					{exercise.status === "UNVERIFIED" && (
						<Alert variant="warning">
							<TriangleAlert />
							<AlertTitle>{t("exercises.unverifiedWarningTitle")}</AlertTitle>
							<AlertDescription>
								{t("exercises.unverifiedWarningBody")}
							</AlertDescription>
						</Alert>
					)}

					{mastery && (
						<section className="space-y-2.5">
							<div className="flex items-center justify-between gap-2">
								<h3 className="text-sm font-semibold">
									{t("exercises.skillTree.masteryTitle")}
								</h3>
								{mastery.highestTier !== "NONE" && (
									<Badge
										variant="outline"
										size="sm"
										className={TIER_BADGE_CLASS[mastery.highestTier]}
									>
										{t(`exercises.skillTree.tiers.${mastery.highestTier}`)}
									</Badge>
								)}
							</div>

							{hasLegacyTiers ? (
								<Frame spacing="xs">
									{mastery.tiers.map((tier, idx) => {
										const prevAchieved =
											idx === 0
												? true
												: Boolean(mastery.tiers[idx - 1]?.achieved);
										const displayState = getTierDisplayState(
											tier,
											mastery.status,
											prevAchieved,
										);
										const consecutiveDone = tier.achieved
											? tier.minConsecutiveSessions
											: Math.min(
													tier.currentConsecutiveSessions,
													tier.minConsecutiveSessions,
												);
										const barValue = tier.achieved ? 100 : tier.progressPercent;

										return (
											<FramePanel key={tier.tier} className="space-y-2">
												<div className="flex flex-wrap items-center justify-between gap-2">
													<Badge
														variant="outline"
														size="sm"
														className={TIER_BADGE_CLASS[tier.tier]}
													>
														{t(`exercises.skillTree.tiers.${tier.tier}`)}
													</Badge>
													<Badge
														variant={
															displayState === "achieved"
																? "success-light"
																: displayState === "implied"
																	? "info-light"
																	: displayState === "inProgress"
																		? "primary-light"
																		: "secondary"
														}
														size="xs"
													>
														{(displayState === "achieved" ||
															displayState === "implied") && <Check />}
														{displayState === "locked" && <Lock />}
														{t(
															displayState === "achieved"
																? "exercises.skillTree.tierAchieved"
																: displayState === "implied"
																	? "exercises.skillTree.tierImplied"
																	: displayState === "inProgress"
																		? "exercises.skillTree.tierInProgress"
																		: "exercises.skillTree.tierLocked",
														)}
													</Badge>
												</div>

												<Progress value={barValue}>
													<ProgressLabel className="text-xs">
														{tier.measure === "SECONDS"
															? t("exercises.skillTree.benchmarkSeconds", {
																	sets: tier.targetSets,
																	val: tier.targetValue,
																})
															: t("exercises.skillTree.benchmarkReps", {
																	sets: tier.targetSets,
																	val: tier.targetValue,
																})}{" "}
														·{" "}
														{t("exercises.skillTree.setsProgress", {
															done: tier.bestSetsInSession,
															target: tier.targetSets,
														})}
													</ProgressLabel>
													<ProgressValue className="text-xs" />
												</Progress>

												{(tier.minConsecutiveSessions > 1 ||
													tier.maxRpe != null ||
													Boolean(tier.tempo)) && (
													<div className="flex flex-wrap items-center gap-1.5">
														{tier.minConsecutiveSessions > 1 && (
															<Badge variant="secondary" size="xs">
																{t("exercises.skillTree.consecutiveSessions", {
																	done: consecutiveDone,
																	required: tier.minConsecutiveSessions,
																})}
															</Badge>
														)}
														{tier.maxRpe != null && (
															<Badge variant="outline" size="xs">
																{t("exercises.skillTree.maxRpeLimit", {
																	rpe: tier.maxRpe,
																})}
															</Badge>
														)}
														{tier.tempo && (
															<Badge variant="outline" size="xs">
																{t("exercises.skillTree.tempoLabel", {
																	tempo: tier.tempo,
																})}
															</Badge>
														)}
													</div>
												)}

												{tier.formStandard && (
													<p className="text-xs text-muted-foreground">
														{tier.formStandard}
													</p>
												)}
											</FramePanel>
										);
									})}
								</Frame>
							) : (
								<Progress value={mastery.progressPercent}>
									<ProgressLabel>
										{mastery.measure === "SECONDS"
											? t("exercises.skillTree.masteryDetailSeconds", {
													done: mastery.bestSetsInSession,
													sets: mastery.targetSets,
													val: mastery.targetValue,
												})
											: t("exercises.skillTree.masteryDetailReps", {
													done: mastery.bestSetsInSession,
													sets: mastery.targetSets,
													val: mastery.targetValue,
												})}
									</ProgressLabel>
									<ProgressValue />
								</Progress>
							)}
						</section>
					)}

					{((exercise.muscles && exercise.muscles.length > 0) ||
						exercise.primaryMuscles.length > 0 ||
						exercise.secondaryMuscles.length > 0) && (
						<section className="space-y-3">
							<h3 className="text-sm font-semibold">
								{t("exercises.musclesTitle")}
							</h3>
							<AnatomicalBodyMap
								compact
								gender={bodyMapGender}
								intensityByMuscle={computeExerciseMuscleMap(exercise)}
								frontLabel={t("heatmap.frontLabel")}
								backLabel={t("heatmap.backLabel")}
								muscleLabel={(m) =>
									t(`heatmap.muscles.${m}` as "heatmap.muscles.mid_chest")
								}
								intensityLabels={{
									primary: t("heatmap.primaryLegend"),
									secondary: t("heatmap.secondaryLegend"),
									untargeted: t("heatmap.untargetedLegend"),
								}}
							/>
							<div className="flex flex-wrap gap-1.5">
								{exercise.muscles && exercise.muscles.length > 0 ? (
									exercise.muscles.map((entry) => {
										const norm = normalizeMuscleGroupId(entry.muscleGroup);
										if (!norm) return null;
										const variant =
											entry.role === "PRIMARY"
												? "primary-light"
												: entry.role === "SECONDARY"
													? "secondary"
													: "outline";
										return (
											<Badge
												key={`em-${entry.muscleGroup}`}
												variant={variant}
												size="sm"
											>
												{t(
													`heatmap.muscles.${norm}` as "heatmap.muscles.mid_chest",
												)}{" "}
												· {entry.activationWeight}%
											</Badge>
										);
									})
								) : (
									<>
										{exercise.primaryMuscles.map((muscle) => {
											const norm = normalizeMuscleGroupId(muscle);
											if (!norm) return null;
											return (
												<Badge
													key={`pm-${muscle}`}
													variant="primary-light"
													size="sm"
												>
													{t(
														`heatmap.muscles.${norm}` as "heatmap.muscles.mid_chest",
													)}
												</Badge>
											);
										})}
										{exercise.secondaryMuscles.map((muscle) => {
											const norm = normalizeMuscleGroupId(muscle);
											if (!norm) return null;
											return (
												<Badge
													key={`sm-${muscle}`}
													variant="secondary"
													size="sm"
												>
													{t(
														`heatmap.muscles.${norm}` as "heatmap.muscles.mid_chest",
													)}
												</Badge>
											);
										})}
									</>
								)}
							</div>
						</section>
					)}

					<section className="space-y-2">
						<h3 className="text-sm font-semibold">
							{t("exercises.cuesTitle")}
						</h3>
						<ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
							{exercise.cues.map((cue) => (
								<li key={cue}>{cue}</li>
							))}
						</ul>
					</section>

					{exercise.contraindications.length > 0 && (
						<section className="space-y-2">
							<h3 className="text-sm font-semibold">
								{t("exercises.avoidIfInjuredTitle")}
							</h3>
							<div className="flex flex-wrap gap-1.5">
								{exercise.contraindications.map((injury) => (
									<Badge key={injury} variant="destructive-light" size="sm">
										{t(
											`onboarding.body.injuryOptions.${injury}` as "onboarding.body.injuryOptions.shoulder",
										)}
									</Badge>
								))}
							</div>
						</section>
					)}

					{hasDagConnections ? (
						<section className="space-y-3">
							<h3 className="text-sm font-semibold">
								{t("exercises.progressionTitle")}
							</h3>

							{incomingRequirements.length > 0 && (
								<div className="space-y-1.5">
									<p className="text-xs font-medium text-muted-foreground">
										{t("exercises.skillTree.prerequisitesTitle")}
									</p>
									<Frame spacing="xs">
										{incomingRequirements.map((req) => {
											const target = exercisesById.get(req.exerciseId);
											return (
												<button
													key={req.edgeId}
													type="button"
													disabled={!target}
													onClick={() => {
														if (target) onSelectExercise(target);
													}}
													className="block w-full rounded-(--frame-panel-radius) text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-70"
												>
													<FramePanel className="flex items-center justify-between gap-2 transition-colors hover:bg-muted/30">
														<div className="min-w-0 space-y-1">
															<p className="truncate text-sm font-medium">
																{req.exerciseName}
															</p>
															<div className="flex flex-wrap items-center gap-1">
																<Badge variant="outline" size="xs">
																	{t(
																		`exercises.skillTree.edgeKinds.${req.kind}`,
																	)}
																</Badge>
																{req.isCrossPattern && (
																	<Badge variant="info-light" size="xs">
																		{t(
																			`exercises.patterns.${req.exercisePattern}`,
																		)}
																	</Badge>
																)}
																<Badge variant="secondary" size="xs">
																	{t("exercises.skillTree.requiredTierBadge", {
																		tier: t(
																			`exercises.skillTree.tiers.${req.requiredTier}`,
																		),
																	})}
																</Badge>
															</div>
														</div>
														<div className="flex shrink-0 items-center gap-1.5">
															{mastery &&
																(req.isMet ? (
																	<Badge variant="success-light" size="xs">
																		<Check />
																		{req.currentTier !== "NONE"
																			? t(
																					`exercises.skillTree.tiers.${req.currentTier}`,
																				)
																			: t("exercises.skillTree.tierAchieved")}
																	</Badge>
																) : (
																	<Badge variant="secondary" size="xs">
																		<Lock />
																		{t("exercises.skillTree.tierLocked")}
																	</Badge>
																))}
															<ChevronRight className="size-4 text-muted-foreground" />
														</div>
													</FramePanel>
												</button>
											);
										})}
									</Frame>
								</div>
							)}

							{outgoingUnlocks.length > 0 && (
								<div className="space-y-1.5">
									<p className="text-xs font-medium text-muted-foreground">
										{t("exercises.skillTree.unlocksTitle")}
									</p>
									<Frame spacing="xs">
										{outgoingUnlocks.map((unlock) => {
											const target = exercisesById.get(unlock.exerciseId);
											const targetMastery =
												masteryByExerciseId?.[unlock.exerciseId];
											return (
												<button
													key={unlock.edgeId}
													type="button"
													disabled={!target}
													onClick={() => {
														if (target) onSelectExercise(target);
													}}
													className="block w-full rounded-(--frame-panel-radius) text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-70"
												>
													<FramePanel className="flex items-center justify-between gap-2 transition-colors hover:bg-muted/30">
														<div className="min-w-0 space-y-1">
															<p className="truncate text-sm font-medium">
																{unlock.exerciseName}
															</p>
															<div className="flex flex-wrap items-center gap-1">
																{unlock.branchLabel ? (
																	<Badge variant="outline" size="xs">
																		{unlock.branchLabel}
																	</Badge>
																) : (
																	<Badge variant="outline" size="xs">
																		{t(
																			`exercises.skillTree.edgeKinds.${unlock.kind}`,
																		)}
																	</Badge>
																)}
																{unlock.isCrossPattern && (
																	<Badge variant="info-light" size="xs">
																		{t(
																			`exercises.patterns.${unlock.exercisePattern}`,
																		)}
																	</Badge>
																)}
																<Badge variant="secondary" size="xs">
																	{t("exercises.skillTree.requiredTierBadge", {
																		tier: t(
																			`exercises.skillTree.tiers.${unlock.requiredTier}`,
																		),
																	})}
																</Badge>
															</div>
														</div>
														<div className="flex shrink-0 items-center gap-1.5">
															{targetMastery &&
																(targetMastery.highestTier !== "NONE" ? (
																	<Badge
																		variant="outline"
																		size="xs"
																		className={
																			TIER_BADGE_CLASS[
																				targetMastery.highestTier
																			]
																		}
																	>
																		{t(
																			`exercises.skillTree.tiers.${targetMastery.highestTier}`,
																		)}
																	</Badge>
																) : (
																	<Badge
																		variant={
																			targetMastery.status === "ongoing"
																				? "primary-light"
																				: "secondary"
																		}
																		size="xs"
																	>
																		{t(
																			`exercises.skillTree.status.${targetMastery.status}`,
																		)}
																	</Badge>
																))}
															<ChevronRight className="size-4 text-muted-foreground" />
														</div>
													</FramePanel>
												</button>
											);
										})}
									</Frame>
								</div>
							)}
						</section>
					) : (
						chain.length > 1 && (
							<section className="space-y-3">
								<h3 className="text-sm font-semibold">
									{t("exercises.progressionTitle")}
								</h3>
								<Timeline value={activeIndex + 1}>
									{chain.map((stepEx, idx) => {
										const isCurrent = stepEx.id === exercise.id;
										return (
											<TimelineItem key={stepEx.id} step={idx + 1}>
												<TimelineHeader>
													<TimelineIndicator />
													<TimelineSeparator />
													<TimelineTitle className="flex items-center gap-2">
														<button
															type="button"
															onClick={() => onSelectExercise(stepEx)}
															className="text-left hover:underline"
														>
															{stepEx.name}
														</button>
														{isCurrent && (
															<Badge variant="primary-light" size="xs">
																{t("exercises.currentStepBadge")}
															</Badge>
														)}
													</TimelineTitle>
												</TimelineHeader>
												<TimelineContent>
													{t("exercises.levelBadge", {
														level: stepEx.difficulty,
													})}
												</TimelineContent>
											</TimelineItem>
										);
									})}
								</Timeline>
							</section>
						)
					)}

					{exercise.license && (
						<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<span>
								{t("exercises.sourceAttribution", {
									license: exercise.license,
								})}
							</span>
							{exercise.sourceUrl && (
								<a
									href={exercise.sourceUrl}
									target="_blank"
									rel="noreferrer"
									aria-label={exercise.name}
									className="inline-flex items-center hover:text-foreground"
								>
									<ExternalLink className="size-3" />
								</a>
							)}
						</p>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
