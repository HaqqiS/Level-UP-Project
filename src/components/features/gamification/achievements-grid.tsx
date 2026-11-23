"use client";
import { cn } from "cn";
import {
	Award,
	Crown,
	Dumbbell,
	Flame,
	Loader2,
	Lock,
	Scale,
	Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/reui/badge";
import { IconTile } from "@/components/reui/icon-tile";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { equipTitleAction } from "@/server/actions/gamification";
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
		case "rank":
			return <Crown />;
		default:
			return <Award />;
	}
}

export function AchievementsGrid({
	achievements,
	equippedTitleKey = null,
}: {
	achievements: readonly AchievementItemView[];
	equippedTitleKey?: string | null;
}) {
	const t = useTranslations("achievements");
	const [isPending, startTransition] = useTransition();
	const [pendingKey, setPendingKey] = useState<string | null>(null);
	const unlockedCount = achievements.filter(
		(badge) => badge.unlockedAt !== null,
	).length;

	function handleToggleEquip(badge: AchievementItemView, isEquipped: boolean) {
		setPendingKey(badge.key);
		startTransition(async () => {
			try {
				const res = await equipTitleAction(isEquipped ? null : badge.key);
				if (!res.ok) {
					toast.error(t("titleEquipError"));
					return;
				}
				if (res.equippedTitle) {
					toast.success(t("titleEquippedToast", { title: res.equippedTitle }));
				} else {
					toast.success(t("titleClearedToast"));
				}
			} catch {
				toast.error(t("titleEquipError"));
			} finally {
				setPendingKey(null);
			}
		});
	}

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
						const isEquipped = unlocked && equippedTitleKey === badge.key;
						const isSavingThis = isPending && pendingKey === badge.key;
						return (
							<div
								key={badge.key}
								className={cn(
									"flex flex-col justify-between gap-2.5 rounded-2xl bg-muted/50 p-3",
									isEquipped && "bg-primary/10 ring-1 ring-primary/25",
								)}
							>
								<div className="space-y-2">
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

									<div className="flex flex-wrap items-center gap-1">
										<span className="text-[0.6875rem] font-medium text-muted-foreground">
											{t("titleRewardLabel", { title: badge.titleReward })}
										</span>
										{isEquipped && (
											<Badge variant="primary-light" size="xs">
												{t("equippedBadge")}
											</Badge>
										)}
									</div>
								</div>

								{unlocked && (
									<Button
										size="xs"
										variant={isEquipped ? "outline" : "secondary"}
										disabled={isPending}
										onClick={() => handleToggleEquip(badge, isEquipped)}
										className="w-full"
									>
										{isSavingThis && <Loader2 className="animate-spin" />}
										{isEquipped ? t("unequipAction") : t("equipAction")}
									</Button>
								)}
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
