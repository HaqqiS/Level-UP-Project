"use client";
import { cn } from "cn";
import { Check, Loader2, Lock, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
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
	onOptimisticTitleChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	achievements: readonly AchievementItemView[];
	equippedTitleKey: string | null;
	onOptimisticTitleChange?: (key: string | null, title: string | null) => void;
}) {
	const t = useTranslations("gamification");
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [pendingKey, setPendingKey] = useState<string | null>(null);
	const [activeTitleKey, setActiveTitleKey] = useState<string | null>(
		equippedTitleKey,
	);

	useEffect(() => {
		setActiveTitleKey(equippedTitleKey);
	}, [equippedTitleKey]);

	const unlocked = achievements.filter((item) => item.unlockedAt !== null);
	const locked = achievements.filter((item) => item.unlockedAt === null);

	function handleOpenChange(nextOpen: boolean) {
		if (isPending) return;
		onOpenChange(nextOpen);
	}

	function handleSelect(achievementKey: string | null) {
		if (isPending || achievementKey === activeTitleKey) return;

		const prevKey = activeTitleKey;
		const prevTitle =
			prevKey !== null
				? (achievements.find((a) => a.key === prevKey)?.titleReward ?? null)
				: null;
		const nextTitle =
			achievementKey !== null
				? (achievements.find((a) => a.key === achievementKey)?.titleReward ??
					null)
				: null;

		setActiveTitleKey(achievementKey);
		onOptimisticTitleChange?.(achievementKey, nextTitle);
		setPendingKey(achievementKey ?? "__none__");

		startTransition(async () => {
			try {
				const res = await equipTitleAction(achievementKey);
				if (!res.ok) {
					setActiveTitleKey(prevKey);
					onOptimisticTitleChange?.(prevKey, prevTitle);
					toast.error(
						res.reason === "not_unlocked"
							? t("titleNotUnlockedError")
							: t("titleEquipError"),
					);
					return;
				}
				const resolvedKey = res.equippedTitleKey ?? null;
				const resolvedTitle = res.equippedTitle ?? null;
				setActiveTitleKey(resolvedKey);
				onOptimisticTitleChange?.(resolvedKey, resolvedTitle);
				if (resolvedTitle) {
					toast.success(t("titleEquippedToast", { title: resolvedTitle }));
				} else {
					toast.success(t("titleClearedToast"));
				}
				router.refresh();
				onOpenChange(false);
			} catch {
				setActiveTitleKey(prevKey);
				onOptimisticTitleChange?.(prevKey, prevTitle);
				toast.error(t("titleEquipError"));
			} finally {
				setPendingKey(null);
			}
		});
	}

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
			<SheetContent
				side="bottom"
				className="mx-auto flex max-h-[85dvh] max-w-md flex-col overflow-hidden"
			>
				<SheetHeader className="shrink-0 pr-12">
					<SheetTitle>{t("titlePickerTitle")}</SheetTitle>
					<SheetDescription>{t("titlePickerDescription")}</SheetDescription>
				</SheetHeader>

				<div className="min-h-0 flex-1 overflow-y-auto px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
					<div className="flex flex-col gap-4">
						{activeTitleKey !== null && (
							<button
								type="button"
								disabled={isPending}
								onClick={() => handleSelect(null)}
								className="flex w-full items-center justify-between gap-3 rounded-2xl bg-muted/50 p-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
							>
								<div className="flex min-w-0 flex-col gap-0.5">
									<p className="text-sm font-semibold">{t("noTitleOption")}</p>
									<p className="text-xs text-muted-foreground">
										{t("noTitleOptionDesc")}
									</p>
								</div>
								{isPending && pendingKey === "__none__" ? (
									<Loader2
										aria-hidden="true"
										className="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none"
									/>
								) : (
									<X
										aria-hidden="true"
										className="size-4 shrink-0 text-muted-foreground"
									/>
								)}
							</button>
						)}

						<div className="flex flex-col gap-2">
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
								<div className="flex flex-col gap-2">
									{unlocked.map((badge) => {
										const isEquipped = badge.key === activeTitleKey;
										const isSavingThis = isPending && pendingKey === badge.key;
										return (
											<button
												key={badge.key}
												type="button"
												disabled={isPending}
												aria-pressed={isEquipped}
												aria-current={isEquipped ? "true" : undefined}
												onClick={() => {
													if (!isEquipped) handleSelect(badge.key);
												}}
												className={cn(
													"flex w-full items-center justify-between gap-3 rounded-2xl p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
													isEquipped
														? "cursor-default bg-primary/10 ring-1 ring-primary/25"
														: "bg-muted/50 hover:bg-muted",
												)}
											>
												<div className="flex min-w-0 flex-col gap-0.5">
													<div className="flex flex-wrap items-center gap-1.5">
														<Sparkles
															aria-hidden="true"
															className="size-3.5 shrink-0 text-primary"
														/>
														<span className="text-sm font-semibold">
															{badge.titleReward}
														</span>
													</div>
													<p className="text-xs text-muted-foreground">
														{badge.title}
													</p>
												</div>
												{isSavingThis ? (
													<Loader2
														aria-hidden="true"
														className="size-4 shrink-0 animate-spin text-primary motion-reduce:animate-none"
													/>
												) : isEquipped ? (
													<Badge variant="primary-light" className="shrink-0">
														<Check aria-hidden="true" />
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
							<div className="flex flex-col gap-2">
								<p className="text-xs font-medium text-muted-foreground">
									{t("lockedTitlesHeading", { count: locked.length })}
								</p>
								<div className="flex flex-col gap-2">
									{locked.map((badge) => (
										<div
											key={badge.key}
											className="flex items-start justify-between gap-3 rounded-2xl bg-muted/40 p-3"
										>
											<div className="flex min-w-0 flex-col gap-0.5">
												<p className="text-sm font-semibold text-muted-foreground">
													{badge.titleReward}
												</p>
												<p className="text-xs text-muted-foreground">
													{badge.description}
												</p>
											</div>
											<Lock
												aria-hidden="true"
												className="mt-0.5 size-4 shrink-0 text-muted-foreground"
											/>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
