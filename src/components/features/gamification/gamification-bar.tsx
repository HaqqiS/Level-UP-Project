"use client";
import { Flame, Shield, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/reui/badge";
import {
	Frame,
	FrameDescription,
	FramePanel,
	FrameTitle,
} from "@/components/reui/frame";
import { IconTile } from "@/components/reui/icon-tile";
import {
	Progress,
	ProgressLabel,
	ProgressValue,
} from "@/components/ui/progress";
import type { GamificationSummary } from "./types";

export function GamificationBar({ stats }: { stats: GamificationSummary }) {
	const t = useTranslations("gamification");
	const freezeReady = stats.freezesAvailable > 0 && !stats.freezeUsedThisWeek;

	return (
		<Frame>
			<FramePanel className="space-y-3">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="primary-light">
							<Trophy />
							{t("level", { level: stats.level })}
						</Badge>
						<Badge variant="secondary">
							{t("totalXp", { xp: stats.totalXp })}
						</Badge>
					</div>
					<div className="flex flex-wrap items-center gap-1.5">
						<Badge
							variant={stats.currentStreak > 0 ? "warning-light" : "outline"}
						>
							<Flame />
							{t("streak", { days: stats.currentStreak })}
						</Badge>
						{stats.longestStreak > 0 && (
							<Badge variant="outline">
								{t("longestStreak", { days: stats.longestStreak })}
							</Badge>
						)}
					</div>
				</div>

				<Progress value={stats.levelProgress.progressPercent}>
					<ProgressLabel>
						{t("xpProgress", {
							current: stats.levelProgress.currentLevelXp,
							required: stats.levelProgress.requiredLevelXp,
						})}
					</ProgressLabel>
					<ProgressValue />
				</Progress>
			</FramePanel>

			<FramePanel className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 items-start gap-3">
					<IconTile variant="soft" size="sm">
						<Shield />
					</IconTile>
					<div className="min-w-0 space-y-0.5">
						<FrameTitle>{t("freezeTitle")}</FrameTitle>
						<FrameDescription>
							{freezeReady
								? t("freezeReadyDescription")
								: stats.lastFrozenDate
									? t("freezeUsedOnDate", { date: stats.lastFrozenDate })
									: t("freezeUsedDescription")}
						</FrameDescription>
					</div>
				</div>
				<Badge variant={freezeReady ? "info-light" : "warning-light"} size="sm">
					{freezeReady ? t("freezeReadyBadge") : t("freezeUsedBadge")}
				</Badge>
			</FramePanel>
		</Frame>
	);
}
