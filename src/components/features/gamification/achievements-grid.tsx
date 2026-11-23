"use client";
import { Award, Dumbbell, Flame, Lock, Scale, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/reui/badge";
import {
	Frame,
	FrameDescription,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@/components/reui/frame";
import { IconTile } from "@/components/reui/icon-tile";
import type { AchievementItemView } from "./types";

function CategoryIcon({
	category,
	unlocked,
}: {
	category: AchievementItemView["category"];
	unlocked: boolean;
}) {
	if (!unlocked) {
		return <Lock className="text-muted-foreground" />;
	}
	switch (category) {
		case "consistency":
			return <Flame />;
		case "volume":
			return <Dumbbell />;
		case "skill":
			return <Sparkles />;
		case "body":
			return <Scale />;
		default:
			return <Award />;
	}
}

export function AchievementsGrid({
	achievements,
}: {
	achievements: readonly AchievementItemView[];
}) {
	const t = useTranslations("achievements");
	const unlockedCount = achievements.filter(
		(badge) => badge.unlockedAt !== null,
	).length;

	return (
		<Frame spacing="sm">
			<FrameHeader>
				<FrameTitle>{t("title")}</FrameTitle>
				<FrameDescription>
					{t("description", {
						unlocked: unlockedCount,
						total: achievements.length,
					})}
				</FrameDescription>
			</FrameHeader>
			<div className="grid grid-cols-2 gap-1.5">
				{achievements.map((badge) => {
					const unlocked = badge.unlockedAt !== null;
					return (
						<FramePanel
							key={badge.key}
							className="flex flex-col justify-between gap-2"
						>
							<div className="flex items-start justify-between gap-2">
								<IconTile variant={unlocked ? "soft" : "outline"} size="sm">
									<CategoryIcon category={badge.category} unlocked={unlocked} />
								</IconTile>
								<Badge
									variant={unlocked ? "success-light" : "outline"}
									size="xs"
								>
									{t("xpReward", { xp: badge.xpReward })}
								</Badge>
							</div>
							<div className="space-y-0.5">
								<FrameTitle>{badge.title}</FrameTitle>
								<FrameDescription>{badge.description}</FrameDescription>
							</div>
						</FramePanel>
					);
				})}
			</div>
		</Frame>
	);
}
