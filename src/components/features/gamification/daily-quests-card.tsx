"use client";
import { cn } from "cn";
import {
	CheckCircle2,
	Circle,
	Droplets,
	Loader2,
	Swords,
	Trophy,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemFooter,
	ItemGroup,
	ItemMedia,
	ItemTitle,
} from "@/components/ui/item";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { completeQuestAction } from "@/server/actions/workout";
import type { QuestItemView } from "./types";

const HYDRATION_TARGET_ML = 2000;

function getQuestActionConfig(
	quest: QuestItemView,
	t: ReturnType<typeof useTranslations>,
): { label: string; kind: "logger" | "checkin" } {
	if (quest.type === "WEEKLY") {
		if (quest.key === "weekly-checkin") {
			return { label: t("quests.checkinAction"), kind: "checkin" };
		}
		if (quest.key === "weekly-sessions") {
			return { label: t("quests.trainAction"), kind: "logger" };
		}
		if (quest.key === "weekly-sets") {
			return { label: t("quests.logAction"), kind: "logger" };
		}
	}
	return { label: t("quests.logAction"), kind: "logger" };
}

function QuestRow({
	quest,
	isRestDay,
	todayHydrationMl = 0,
	onOpenLogger,
}: {
	quest: QuestItemView;
	isRestDay: boolean;
	todayHydrationMl?: number;
	onOpenLogger?: () => void;
}) {
	const t = useTranslations();
	const [pending, startTransition] = useTransition();
	const isDone = quest.status === "COMPLETED";
	const isHydrationQuest = quest.key === "side-hydrate";
	const canOneTap =
		quest.type === "SIDE" || (quest.type === "DAILY" && isRestDay);

	const hydrationCurrentMl = isDone
		? Math.max(HYDRATION_TARGET_ML, todayHydrationMl)
		: Math.max(0, todayHydrationMl);
	const percent = isHydrationQuest
		? Math.min(
				100,
				Math.round((hydrationCurrentMl / HYDRATION_TARGET_ML) * 100),
			)
		: quest.target > 0
			? Math.min(100, Math.round((quest.progress / quest.target) * 100))
			: 0;
	const showProgressBar = quest.target > 1 || isHydrationQuest;

	const actionConfig = getQuestActionConfig(quest, t);

	function handleComplete() {
		startTransition(async () => {
			const res = await completeQuestAction(quest.id);
			if (res.ok) {
				toast.success(t("quests.xpAwarded", { xp: res.xpAwarded }));
			} else {
				toast.error(t("common.error"));
			}
		});
	}

	function handleScrollToSession() {
		const el = document.getElementById("today-session");
		if (el) {
			el.scrollIntoView({ behavior: "auto", block: "start" });
		}
	}

	return (
		<Item
			variant="muted"
			size="sm"
			className={cn(
				"items-start gap-3 bg-muted/50",
				isDone && "bg-muted/30 opacity-75",
			)}
		>
			<ItemMedia
				variant="icon"
				className="mt-0.5 size-6 group-has-data-[slot=item-description]/item:translate-y-0"
			>
				{isDone ? (
					<CheckCircle2 aria-hidden="true" className="text-primary" />
				) : isHydrationQuest ? (
					<Droplets aria-hidden="true" className="text-info-foreground" />
				) : quest.type === "WEEKLY" ? (
					<Trophy aria-hidden="true" />
				) : quest.type === "DAILY" ? (
					<Swords aria-hidden="true" />
				) : (
					<Circle aria-hidden="true" className="text-muted-foreground" />
				)}
			</ItemMedia>
			<ItemContent className="min-w-0 flex-1">
				<ItemTitle className="line-clamp-2 w-auto">{quest.title}</ItemTitle>
				<ItemDescription className="text-xs tabular-nums">
					{isHydrationQuest
						? t("quests.hydrationProgress", {
								current: hydrationCurrentMl,
								target: HYDRATION_TARGET_ML,
							})
						: t("quests.progress", {
								progress: quest.progress,
								target: quest.target,
							})}
				</ItemDescription>
				{showProgressBar && <Progress value={percent} className="gap-1.5" />}
			</ItemContent>
			<ItemFooter className="flex-wrap gap-2">
				<Badge
					variant={isDone ? "success-light" : "secondary"}
					className="tabular-nums"
				>
					{quest.type === "DAILY" && !isRestDay
						? t("quests.sessionXpReward", { xp: quest.xpReward })
						: t("quests.xpReward", { xp: quest.xpReward })}
				</Badge>
				{!isDone && (
					<div className="flex flex-wrap items-center justify-end gap-2">
						{isHydrationQuest && (
							<Button
								size="sm"
								variant="outline"
								nativeButton={false}
								render={<Link href="/calendar" />}
							>
								{t("quests.logWaterAction")}
							</Button>
						)}
						{canOneTap ? (
							<Button
								type="button"
								size="sm"
								disabled={pending}
								onClick={handleComplete}
							>
								{pending && (
									<Loader2
										aria-hidden="true"
										className="animate-spin motion-reduce:animate-none"
									/>
								)}
								{t("quests.completeAction")}
							</Button>
						) : actionConfig.kind === "checkin" ? (
							onOpenLogger ? (
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={handleScrollToSession}
								>
									{actionConfig.label}
								</Button>
							) : (
								<Button
									size="sm"
									variant="outline"
									nativeButton={false}
									render={<Link href="/today#today-session" />}
								>
									{actionConfig.label}
								</Button>
							)
						) : onOpenLogger ? (
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={onOpenLogger}
							>
								{actionConfig.label}
							</Button>
						) : (
							<Button
								size="sm"
								variant="outline"
								nativeButton={false}
								render={<Link href="/today?tab=log" />}
							>
								{actionConfig.label}
							</Button>
						)}
					</div>
				)}
			</ItemFooter>
		</Item>
	);
}

export function DailyQuestsCard({
	quests,
	weeklyQuests,
	isRestDay,
	todayHydrationMl = 0,
	onOpenLogger,
	onOpenPlan,
}: {
	quests: QuestItemView[];
	weeklyQuests: QuestItemView[];
	isRestDay: boolean;
	todayHydrationMl?: number;
	onOpenLogger?: () => void;
	onOpenPlan?: () => void;
}) {
	const t = useTranslations("quests");

	const emptyPlanCta = onOpenPlan ? (
		<Button type="button" size="sm" variant="outline" onClick={onOpenPlan}>
			{t("emptyActionViewPlan")}
		</Button>
	) : (
		<Button
			size="sm"
			variant="outline"
			nativeButton={false}
			render={<Link href="/today?tab=plan" />}
		>
			{t("emptyActionViewPlan")}
		</Button>
	);

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle>{t("title")}</CardTitle>
			</CardHeader>
			<CardContent>
				<Tabs defaultValue="daily" className="gap-3">
					<TabsList>
						<TabsTrigger value="daily">{t("dailyTab")}</TabsTrigger>
						<TabsTrigger value="weekly">{t("weeklyTab")}</TabsTrigger>
					</TabsList>
					<TabsContent value="daily">
						{quests.length === 0 ? (
							<Empty className="py-6">
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<Swords aria-hidden="true" />
									</EmptyMedia>
									<EmptyTitle>{t("emptyDailyTitle")}</EmptyTitle>
									<EmptyDescription>
										{t("emptyDailyDescription")}
									</EmptyDescription>
								</EmptyHeader>
								<EmptyContent>{emptyPlanCta}</EmptyContent>
							</Empty>
						) : (
							<ItemGroup>
								{quests.map((quest) => (
									<QuestRow
										key={quest.id}
										quest={quest}
										isRestDay={isRestDay}
										todayHydrationMl={todayHydrationMl}
										onOpenLogger={onOpenLogger}
									/>
								))}
							</ItemGroup>
						)}
					</TabsContent>
					<TabsContent value="weekly">
						{weeklyQuests.length === 0 ? (
							<Empty className="py-6">
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<Trophy aria-hidden="true" />
									</EmptyMedia>
									<EmptyTitle>{t("emptyWeeklyTitle")}</EmptyTitle>
									<EmptyDescription>{t("emptyWeekly")}</EmptyDescription>
								</EmptyHeader>
								<EmptyContent>{emptyPlanCta}</EmptyContent>
							</Empty>
						) : (
							<ItemGroup>
								{weeklyQuests.map((quest) => (
									<QuestRow
										key={quest.id}
										quest={quest}
										isRestDay={isRestDay}
										todayHydrationMl={todayHydrationMl}
										onOpenLogger={onOpenLogger}
									/>
								))}
							</ItemGroup>
						)}
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}
