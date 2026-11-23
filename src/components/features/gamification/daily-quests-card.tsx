"use client";
import { CheckCircle2, Circle, Loader2, Swords, Trophy } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemTitle,
} from "@/components/ui/item";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { completeQuestAction } from "@/server/actions/workout";
import type { QuestItemView } from "./types";

function QuestRow({
	quest,
	isRestDay,
	onOpenLogger,
}: {
	quest: QuestItemView;
	isRestDay: boolean;
	onOpenLogger?: () => void;
}) {
	const t = useTranslations();
	const [pending, startTransition] = useTransition();
	const isDone = quest.status === "COMPLETED";
	const canOneTap =
		quest.type === "SIDE" || (quest.type === "DAILY" && isRestDay);
	const percent =
		quest.target > 0
			? Math.min(100, Math.round((quest.progress / quest.target) * 100))
			: 0;

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

	return (
		<Item
			variant="muted"
			size="sm"
			className={
				isDone
					? "flex-nowrap bg-muted/30 opacity-75"
					: "flex-nowrap bg-muted/50"
			}
		>
			<ItemMedia
				variant="icon"
				className="size-6 group-has-data-[slot=item-description]/item:translate-y-0 group-has-data-[slot=item-description]/item:self-center"
			>
				{isDone ? (
					<CheckCircle2 className="text-primary" />
				) : quest.type === "WEEKLY" ? (
					<Trophy />
				) : quest.type === "DAILY" ? (
					<Swords />
				) : (
					<Circle className="text-muted-foreground" />
				)}
			</ItemMedia>
			<ItemContent className="min-w-0">
				<ItemTitle>{quest.title}</ItemTitle>
				<ItemDescription>
					{t("quests.progress", {
						progress: quest.progress,
						target: quest.target,
					})}
				</ItemDescription>
				{quest.target > 1 && <Progress value={percent} />}
			</ItemContent>
			<ItemActions className="shrink-0">
				<Badge variant={isDone ? "success-light" : "secondary"} size="sm">
					{quest.type === "DAILY" && !isRestDay
						? t("quests.sessionXpReward", { xp: quest.xpReward })
						: t("quests.xpReward", { xp: quest.xpReward })}
				</Badge>
				{!isDone && canOneTap && (
					<Button size="xs" disabled={pending} onClick={handleComplete}>
						{pending && <Loader2 className="animate-spin" />}
						{t("quests.completeAction")}
					</Button>
				)}
				{!isDone &&
					!canOneTap &&
					(onOpenLogger ? (
						<Button size="xs" variant="outline" onClick={onOpenLogger}>
							{t("quests.logAction")}
						</Button>
					) : (
						<Button
							size="xs"
							variant="outline"
							nativeButton={false}
							render={<Link href="/today?tab=log" />}
						>
							{t("quests.logAction")}
						</Button>
					))}
			</ItemActions>
		</Item>
	);
}

export function DailyQuestsCard({
	quests,
	weeklyQuests,
	isRestDay,
	onOpenLogger,
}: {
	quests: QuestItemView[];
	weeklyQuests: QuestItemView[];
	isRestDay: boolean;
	onOpenLogger?: () => void;
}) {
	const t = useTranslations("quests");

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
						<ItemGroup>
							{quests.map((quest) => (
								<QuestRow
									key={quest.id}
									quest={quest}
									isRestDay={isRestDay}
									onOpenLogger={onOpenLogger}
								/>
							))}
						</ItemGroup>
					</TabsContent>
					<TabsContent value="weekly">
						{weeklyQuests.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								{t("emptyWeekly")}
							</p>
						) : (
							<ItemGroup>
								{weeklyQuests.map((quest) => (
									<QuestRow
										key={quest.id}
										quest={quest}
										isRestDay={isRestDay}
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
