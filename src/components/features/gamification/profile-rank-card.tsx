"use client";
import { cn } from "cn";
import {
	CheckCircle2,
	ChevronDown,
	Circle,
	Crown,
	Flame,
	Sparkles,
	Trophy,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Badge } from "@/components/reui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Progress,
	ProgressLabel,
	ProgressValue,
} from "@/components/ui/progress";
import type { ExperienceLevel } from "@/lib/exercises/eligibility";
import type { PromotionGateStatus } from "@/lib/gamification/engine";
import { RANK_STYLES } from "./rank-styles";
import { TitlePickerSheet } from "./title-picker-sheet";
import type { AchievementItemView, GamificationSummary } from "./types";

function getInitials(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
}

type TrialCriterionDisplay = {
	key: string;
	label: string;
	value: string;
	met: boolean;
};

function buildTrialCriteria(
	gate: PromotionGateStatus,
	t: ReturnType<typeof useTranslations>,
): TrialCriterionDisplay[] {
	const items: TrialCriterionDisplay[] = [];

	if (gate.bronze.required > 0) {
		items.push({
			key: "bronze",
			label: t("gamification.trialGateBronze"),
			value: t("gamification.trialGateCountValue", {
				current: gate.bronze.current,
				required: gate.bronze.required,
			}),
			met: gate.bronze.met,
		});
	}
	if (gate.silver.required > 0) {
		items.push({
			key: "silver",
			label: t("gamification.trialGateSilver"),
			value: t("gamification.trialGateCountValue", {
				current: gate.silver.current,
				required: gate.silver.required,
			}),
			met: gate.silver.met,
		});
	}
	if (gate.gold.required > 0) {
		items.push({
			key: "gold",
			label: t("gamification.trialGateGold"),
			value: t("gamification.trialGateCountValue", {
				current: gate.gold.current,
				required: gate.gold.required,
			}),
			met: gate.gold.met,
		});
	}
	if (gate.maxDifficulty.required > 0) {
		items.push({
			key: "difficulty",
			label: t("gamification.trialGateDifficulty"),
			value: t("gamification.trialGateLevelValue", {
				current: gate.maxDifficulty.current,
				required: gate.maxDifficulty.required,
			}),
			met: gate.maxDifficulty.met,
		});
	}
	if (gate.patterns.required > 0) {
		items.push({
			key: "patterns",
			label: t("gamification.trialGatePatterns"),
			value: t("gamification.trialGateCountValue", {
				current: gate.patterns.current,
				required: gate.patterns.required,
			}),
			met: gate.patterns.met,
		});
	}

	return items;
}

export function ProfileRankCard({
	user,
	stats,
	achievements,
	experienceLevel,
	trainingDays,
}: {
	user: {
		name: string;
		email: string;
		image: string | null;
	};
	stats: GamificationSummary;
	achievements: readonly AchievementItemView[];
	experienceLevel: ExperienceLevel;
	trainingDays: readonly number[];
}) {
	const t = useTranslations();
	const [titleSheetOpen, setTitleSheetOpen] = useState(false);
	const [optimisticTitleKey, setOptimisticTitleKey] = useState<string | null>(
		stats.equippedTitleKey ?? null,
	);
	const [optimisticTitle, setOptimisticTitle] = useState<string | null>(
		stats.equippedTitle ?? null,
	);

	useEffect(() => {
		setOptimisticTitleKey(stats.equippedTitleKey ?? null);
		setOptimisticTitle(stats.equippedTitle ?? null);
	}, [stats.equippedTitleKey, stats.equippedTitle]);

	const gate = stats.levelProgress.promotionGate;
	const isHighlightedTrial =
		stats.levelProgress.isPromotionReady || stats.tierLevel >= 9;
	const [trialOpen, setTrialOpen] = useState(isHighlightedTrial);

	useEffect(() => {
		if (isHighlightedTrial) {
			setTrialOpen(true);
		}
	}, [isHighlightedTrial]);

	const tierStyle = RANK_STYLES[stats.rankTier];
	const trialCriteria = gate ? buildTrialCriteria(gate, t) : [];
	const metCriteriaCount = trialCriteria.filter((item) => item.met).length;

	return (
		<>
			<Card size="sm">
				<CardContent className="flex flex-col gap-3">
					{/* Section 1: Identity & Equipped Title */}
					<div className="flex flex-col gap-2.5">
						<div className="flex items-center gap-3">
							<Avatar size="lg">
								{user.image && <AvatarImage src={user.image} alt={user.name} />}
								<AvatarFallback>{getInitials(user.name)}</AvatarFallback>
							</Avatar>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-semibold">{user.name}</p>
								<p className="truncate text-xs text-muted-foreground">
									{user.email}
								</p>
							</div>
						</div>

						<div className="flex flex-wrap items-center justify-between gap-2">
							<div className="flex min-w-0 items-center gap-1.5">
								{optimisticTitle ? (
									<Badge variant="primary-light">
										<Sparkles aria-hidden="true" />
										{optimisticTitle}
									</Badge>
								) : (
									<span className="text-xs text-muted-foreground">
										{t("gamification.noTitleEquipped")}
									</span>
								)}
							</div>
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => setTitleSheetOpen(true)}
							>
								{optimisticTitle
									? t("gamification.changeTitle")
									: t("gamification.chooseTitle")}
							</Button>
						</div>
					</div>

					{/* Section 2: Rank Showcase tonal tile */}
					<div
						className={cn(
							"flex flex-col gap-3 rounded-2xl p-3",
							tierStyle.cardAccentClass,
							tierStyle.ringClass,
						)}
					>
						<div className="flex items-start gap-3">
							<div
								aria-hidden="true"
								className={cn(
									"flex size-11 shrink-0 items-center justify-center rounded-xl font-heading text-lg font-bold",
									tierStyle.emblemClass,
								)}
							>
								{stats.rankTier}
							</div>

							<div className="flex min-w-0 flex-1 flex-col gap-1.5">
								<div className="flex flex-wrap items-center gap-1.5">
									<Badge variant="outline" className={tierStyle.badgeClass}>
										{stats.rankTier === "S" ? (
											<Crown aria-hidden="true" />
										) : (
											<Trophy aria-hidden="true" />
										)}
										{t("gamification.rankLevel", {
											tier: stats.rankTier,
											level: stats.tierLevel,
										})}
									</Badge>
									{stats.rankTier === "S" && (
										<Badge variant="outline" className={tierStyle.badgeClass}>
											{t("gamification.unlimitedRankS")}
										</Badge>
									)}
									<Badge variant="secondary" className="tabular-nums">
										{t("gamification.totalXp", { xp: stats.totalXp })}
									</Badge>
								</div>

								{(stats.currentStreak > 0 || stats.longestStreak > 0) && (
									<div className="flex flex-wrap items-center gap-1.5">
										{stats.currentStreak > 0 && (
											<Badge variant="warning-light" className="tabular-nums">
												<Flame aria-hidden="true" />
												{t("gamification.streak", {
													days: stats.currentStreak,
												})}
											</Badge>
										)}
										{stats.longestStreak > 0 && (
											<Badge variant="outline" className="tabular-nums">
												{t("gamification.longestStreak", {
													days: stats.longestStreak,
												})}
											</Badge>
										)}
									</div>
								)}
							</div>
						</div>

						<Progress
							value={stats.levelProgress.progressPercent}
							className="gap-2"
						>
							<div className="flex w-full items-baseline justify-between gap-2">
								<ProgressLabel className="min-w-0 text-xs tabular-nums">
									{stats.levelProgress.isPromotionReady ? (
										<>
											{t("gamification.promotionTrialReady")} ·{" "}
											{t("gamification.overflowXpBanked", {
												xp: stats.levelProgress.overflowXp,
											})}
										</>
									) : (
										t("gamification.xpProgress", {
											current: stats.levelProgress.currentLevelXp,
											required: stats.levelProgress.requiredLevelXp,
										})
									)}
								</ProgressLabel>
								<ProgressValue className="ml-0 shrink-0 text-xs tabular-nums" />
							</div>
						</Progress>
					</div>

					{/* Section 3: Rank-Up Trial checklist (when promotionGate !== null) */}
					{gate !== null && (
						<div
							className={cn(
								"rounded-2xl p-3",
								isHighlightedTrial
									? "bg-warning/10 dark:bg-warning/15"
									: "bg-muted/50",
							)}
						>
							<Collapsible open={trialOpen} onOpenChange={setTrialOpen}>
								<CollapsibleTrigger className="flex min-h-8 w-full items-center justify-between gap-2 rounded-md py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
									<div className="flex min-w-0 flex-wrap items-center gap-2">
										<span className="text-sm font-semibold">
											{t("gamification.promotionTrialTitle", {
												nextTier: gate.toTier,
											})}
										</span>
										<Badge
											variant={
												stats.levelProgress.isPromotionReady
													? "warning-light"
													: "outline"
											}
											className="tabular-nums"
										>
											{stats.levelProgress.isPromotionReady
												? t("gamification.trialReadyBadge")
												: t("gamification.trialProgressBadge", {
														met: metCriteriaCount,
														total: trialCriteria.length,
													})}
										</Badge>
									</div>
									<ChevronDown
										aria-hidden="true"
										className={cn(
											"size-4 shrink-0 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none",
											trialOpen && "rotate-180",
										)}
									/>
								</CollapsibleTrigger>

								<CollapsibleContent className="flex flex-col gap-2.5 pt-2.5">
									<p className="text-xs text-muted-foreground">
										{stats.levelProgress.isPromotionReady
											? t("gamification.trialReadySubtitle", {
													nextTier: gate.toTier,
												})
											: t("gamification.trialUpcomingSubtitle", {
													nextTier: gate.toTier,
												})}
									</p>

									<div className="flex flex-col gap-1.5">
										{trialCriteria.map((item) => (
											<div
												key={item.key}
												className="flex items-center justify-between gap-2 text-xs"
											>
												<div className="flex min-w-0 items-center gap-1.5">
													{item.met ? (
														<CheckCircle2
															aria-hidden="true"
															className="size-3.5 shrink-0 text-success-foreground"
														/>
													) : (
														<Circle
															aria-hidden="true"
															className="size-3.5 shrink-0 text-muted-foreground"
														/>
													)}
													<span
														className={cn(
															"truncate",
															item.met
																? "font-medium text-foreground"
																: "text-muted-foreground",
														)}
													>
														{item.label}
													</span>
												</div>
												<span
													className={cn(
														"shrink-0 tabular-nums font-medium",
														item.met
															? "text-success-foreground"
															: "text-foreground",
													)}
												>
													{item.value}
												</span>
											</div>
										))}
									</div>

									<Button
										size="sm"
										variant="outline"
										nativeButton={false}
										render={<Link href="/exercises" />}
									>
										{t("gamification.openSkillTree")}
									</Button>
								</CollapsibleContent>
							</Collapsible>
						</div>
					)}

					{/* Section 4: Profile summary tonal tile */}
					<div className="flex flex-col gap-2.5 rounded-2xl bg-muted/50 p-3">
						<div className="flex items-center justify-between gap-2 text-sm">
							<span className="text-muted-foreground">
								{t("profile.level")}
							</span>
							<Badge variant="secondary">
								{t(`onboarding.experience.${experienceLevel}`)}
							</Badge>
						</div>
						<div className="flex items-center justify-between gap-2 text-sm">
							<span className="shrink-0 text-muted-foreground">
								{t("profile.days")}
							</span>
							<div className="flex flex-wrap justify-end gap-1">
								{trainingDays.map((day) => (
									<Badge key={day} variant="outline">
										{t(
											`onboarding.schedule.dayNames.${day}` as "onboarding.schedule.dayNames.0",
										)}
									</Badge>
								))}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<TitlePickerSheet
				open={titleSheetOpen}
				onOpenChange={setTitleSheetOpen}
				achievements={achievements}
				equippedTitleKey={optimisticTitleKey}
				onOptimisticTitleChange={(key, title) => {
					setOptimisticTitleKey(key);
					setOptimisticTitle(title);
				}}
			/>
		</>
	);
}
