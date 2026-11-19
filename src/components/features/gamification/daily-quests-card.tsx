"use client";
import { CheckCircle2, Circle, Loader2, Swords } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/reui/badge";
import {
	Frame,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemTitle,
} from "@/components/ui/item";
import { completeQuestAction } from "@/server/actions/workout";
import type { QuestItemView } from "./types";

function QuestRow({
	quest,
	isRestDay,
}: {
	quest: QuestItemView;
	isRestDay: boolean;
}) {
	const t = useTranslations();
	const [pending, startTransition] = useTransition();
	const isDone = quest.status === "COMPLETED";
	const canOneTap = quest.type === "SIDE" || isRestDay;

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
		<Item variant={isDone ? "muted" : "outline"} size="sm">
			<ItemMedia variant="icon">
				{isDone ? (
					<CheckCircle2 className="text-primary" />
				) : quest.type === "DAILY" ? (
					<Swords />
				) : (
					<Circle className="text-muted-foreground" />
				)}
			</ItemMedia>
			<ItemContent>
				<ItemTitle>{quest.title}</ItemTitle>
				<ItemDescription>
					{t("quests.progress", {
						progress: quest.progress,
						target: quest.target,
					})}
				</ItemDescription>
			</ItemContent>
			<ItemActions>
				<Badge variant={isDone ? "success-light" : "secondary"} size="sm">
					{t("quests.xpReward", { xp: quest.xpReward })}
				</Badge>
				{!isDone && canOneTap && (
					<Button size="xs" disabled={pending} onClick={handleComplete}>
						{pending && <Loader2 className="animate-spin" />}
						{t("quests.completeAction")}
					</Button>
				)}
				{!isDone && !canOneTap && (
					<Button
						size="xs"
						variant="outline"
						nativeButton={false}
						render={<Link href="/log" />}
					>
						{t("quests.logAction")}
					</Button>
				)}
			</ItemActions>
		</Item>
	);
}

export function DailyQuestsCard({
	quests,
	isRestDay,
}: {
	quests: QuestItemView[];
	isRestDay: boolean;
}) {
	const t = useTranslations("quests");

	return (
		<Frame spacing="sm">
			<FrameHeader>
				<FrameTitle>{t("title")}</FrameTitle>
			</FrameHeader>
			<FramePanel>
				<ItemGroup>
					{quests.map((quest) => (
						<QuestRow key={quest.id} quest={quest} isRestDay={isRestDay} />
					))}
				</ItemGroup>
			</FramePanel>
		</Frame>
	);
}
