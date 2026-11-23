"use client";
import { Award, Dumbbell, Flame, Lock, Scale, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/reui/badge";
import { IconTile } from "@/components/reui/icon-tile";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
		<Card size="sm">
			<CardHeader>
				<CardTitle>{t("title")}</CardTitle>
				<CardDescription>
					{t("description", {
						unlocked: unlockedCount,
						total: achievements.length,
					})}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 gap-2">
					{achievements.map((badge) => {
						const unlocked = badge.unlockedAt !== null;
						return (
							<div
								key={badge.key}
								className="flex flex-col justify-between gap-2 rounded-2xl bg-muted/50 p-3"
							>
								<div className="flex items-center justify-between gap-2">
									<IconTile variant={unlocked ? "soft" : "outline"} size="sm">
										<CategoryIcon
											category={badge.category}
											unlocked={unlocked}
										/>
									</IconTile>
									<Badge
										variant={unlocked ? "success-light" : "outline"}
										size="xs"
									>
										{t("xpReward", { xp: badge.xpReward })}
									</Badge>
								</div>
								<div className="space-y-0.5">
									<p className="text-sm font-semibold">{badge.title}</p>
									<p className="text-xs text-muted-foreground">
										{badge.description}
									</p>
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
