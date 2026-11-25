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
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
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
		return <Lock aria-hidden="true" className="text-muted-foreground" />;
	}
	switch (category) {
		case "consistency":
			return <Flame aria-hidden="true" />;
		case "volume":
			return <Dumbbell aria-hidden="true" />;
		case "skill":
			return <Sparkles aria-hidden="true" />;
		case "body":
			return <Scale aria-hidden="true" />;
		case "rank":
			return <Crown aria-hidden="true" />;
		default:
			return <Award aria-hidden="true" />;
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
	const tGamification = useTranslations("gamification");
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [pendingKey, setPendingKey] = useState<string | null>(null);
	const [optimisticEquippedKey, setOptimisticEquippedKey] = useState<
		string | null
	>(equippedTitleKey);

	useEffect(() => {
		setOptimisticEquippedKey(equippedTitleKey);
	}, [equippedTitleKey]);

	const unlockedCount = achievements.filter(
		(badge) => badge.unlockedAt !== null,
	).length;

	function handleToggleEquip(badge: AchievementItemView, isEquipped: boolean) {
		if (isPending) return;
		const prevKey = optimisticEquippedKey;
		const nextKey = isEquipped ? null : badge.key;

		setOptimisticEquippedKey(nextKey);
		setPendingKey(badge.key);
		startTransition(async () => {
			try {
				const res = await equipTitleAction(nextKey);
				if (!res.ok) {
					setOptimisticEquippedKey(prevKey);
					toast.error(tGamification("titleEquipError"));
					return;
				}
				setOptimisticEquippedKey(res.equippedTitleKey ?? null);
				if (res.equippedTitle) {
					toast.success(
						tGamification("titleEquippedToast", { title: res.equippedTitle }),
					);
				} else {
					toast.success(tGamification("titleClearedToast"));
				}
				router.refresh();
			} catch {
				setOptimisticEquippedKey(prevKey);
				toast.error(tGamification("titleEquipError"));
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
						const isEquipped = unlocked && optimisticEquippedKey === badge.key;
						const isSavingThis = isPending && pendingKey === badge.key;
						return (
							<div
								key={badge.key}
								className={cn(
									"flex flex-col justify-between gap-2.5 rounded-2xl bg-muted/50 p-3",
									isEquipped && "bg-primary/10 ring-1 ring-primary/25",
								)}
							>
								<div className="flex flex-col gap-2">
									<div className="flex items-center justify-between gap-2">
										<IconTile variant={unlocked ? "soft" : "outline"} size="sm">
											<CategoryIcon
												category={badge.category}
												unlocked={unlocked}
											/>
										</IconTile>
										<Badge
											variant={unlocked ? "success-light" : "outline"}
											className="tabular-nums"
										>
											{t("xpReward", { xp: badge.xpReward })}
										</Badge>
									</div>

									<div className="flex flex-col gap-0.5">
										<p className="text-sm font-semibold">{badge.title}</p>
										<p className="text-xs text-muted-foreground">
											{badge.description}
										</p>
									</div>

									<div className="flex flex-wrap items-center gap-1.5">
										<span className="text-xs font-medium text-muted-foreground">
											{t("titleRewardLabel", { title: badge.titleReward })}
										</span>
										{isEquipped && (
											<Badge variant="primary-light">
												{tGamification("equippedBadge")}
											</Badge>
										)}
									</div>
								</div>

								{unlocked && (
									<Button
										type="button"
										size="sm"
										variant={isEquipped ? "outline" : "secondary"}
										disabled={isPending}
										onClick={() => handleToggleEquip(badge, isEquipped)}
										className="w-full"
									>
										{isSavingThis && (
											<Loader2
												aria-hidden="true"
												className="animate-spin motion-reduce:animate-none"
											/>
										)}
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
