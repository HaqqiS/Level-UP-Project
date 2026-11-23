"use client";
import { cn } from "cn";
import { Check, Loader2, Lock, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/reui/badge";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { equipTitleAction } from "@/server/actions/gamification";
import type { AchievementItemView } from "./types";

export function TitlePickerSheet({
	open,
	onOpenChange,
	achievements,
	equippedTitleKey,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	achievements: readonly AchievementItemView[];
	equippedTitleKey: string | null;
}) {
	const t = useTranslations("gamification");
	const [isPending, startTransition] = useTransition();
	const [pendingKey, setPendingKey] = useState<string | null>(null);

	const unlocked = achievements.filter((item) => item.unlockedAt !== null);
	const locked = achievements.filter((item) => item.unlockedAt === null);

	function handleSelect(achievementKey: string | null) {
		setPendingKey(achievementKey ?? "__none__");
		startTransition(async () => {
			try {
				const res = await equipTitleAction(achievementKey);
				if (!res.ok) {
					toast.error(
						res.reason === "not_unlocked"
							? t("titleNotUnlockedError")
							: t("titleEquipError"),
					);
					return;
				}
				if (res.equippedTitle) {
					toast.success(t("titleEquippedToast", { title: res.equippedTitle }));
				} else {
					toast.success(t("titleClearedToast"));
				}
				onOpenChange(false);
			} catch {
				toast.error(t("titleEquipError"));
			} finally {
				setPendingKey(null);
			}
		});
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				className="mx-auto max-h-[85dvh] max-w-md overflow-y-auto rounded-t-3xl"
			>
				<SheetHeader>
					<SheetTitle>{t("titlePickerTitle")}</SheetTitle>
					<SheetDescription>{t("titlePickerDescription")}</SheetDescription>
				</SheetHeader>

				<div className="space-y-4 px-6 pb-6">
					{equippedTitleKey !== null && (
						<button
							type="button"
							disabled={isPending}
							onClick={() => handleSelect(null)}
							className="flex w-full items-center justify-between gap-3 rounded-2xl bg-muted/50 p-3 text-left transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
						>
							<div className="min-w-0 space-y-0.5">
								<p className="text-sm font-semibold">{t("noTitleOption")}</p>
								<p className="text-xs text-muted-foreground">
									{t("noTitleOptionDesc")}
								</p>
							</div>
							{isPending && pendingKey === "__none__" ? (
								<Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
							) : (
								<X className="size-4 shrink-0 text-muted-foreground" />
							)}
						</button>
					)}

					<div className="space-y-2">
						<p className="text-xs font-medium text-muted-foreground">
							{t("unlockedTitlesHeading", { count: unlocked.length })}
						</p>
						{unlocked.length === 0 ? (
							<div className="rounded-2xl bg-muted/40 p-3">
								<p className="text-xs text-muted-foreground">
									{t("noUnlockedTitlesHint")}
								</p>
							</div>
						) : (
							<div className="space-y-2">
								{unlocked.map((badge) => {
									const isEquipped = badge.key === equippedTitleKey;
									const isSavingThis = isPending && pendingKey === badge.key;
									return (
										<button
											key={badge.key}
											type="button"
											disabled={isPending || isEquipped}
											onClick={() => handleSelect(badge.key)}
											className={cn(
												"flex w-full items-center justify-between gap-3 rounded-2xl p-3 text-left transition-colors disabled:pointer-events-none",
												isEquipped
													? "bg-primary/10 ring-1 ring-primary/25"
													: "bg-muted/50 hover:bg-muted disabled:opacity-50",
											)}
										>
											<div className="min-w-0 space-y-0.5">
												<div className="flex flex-wrap items-center gap-1.5">
													<Sparkles className="size-3.5 shrink-0 text-primary" />
													<span className="text-sm font-semibold">
														{badge.titleReward}
													</span>
												</div>
												<p className="text-xs text-muted-foreground">
													{badge.title}
												</p>
											</div>
											{isSavingThis ? (
												<Loader2 className="size-4 shrink-0 animate-spin text-primary" />
											) : isEquipped ? (
												<Badge
													variant="primary-light"
													size="sm"
													className="shrink-0"
												>
													<Check />
													{t("equippedBadge")}
												</Badge>
											) : null}
										</button>
									);
								})}
							</div>
						)}
					</div>

					{locked.length > 0 && (
						<div className="space-y-2">
							<p className="text-xs font-medium text-muted-foreground">
								{t("lockedTitlesHeading", { count: locked.length })}
							</p>
							<div className="space-y-2">
								{locked.map((badge) => (
									<div
										key={badge.key}
										className="flex items-start justify-between gap-3 rounded-2xl bg-muted/40 p-3 opacity-65"
									>
										<div className="min-w-0 space-y-0.5">
											<p className="text-sm font-semibold">
												{badge.titleReward}
											</p>
											<p className="text-xs text-muted-foreground">
												{badge.description}
											</p>
										</div>
										<Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
