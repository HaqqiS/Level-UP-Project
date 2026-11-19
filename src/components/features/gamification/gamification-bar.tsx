"use client";
import { Flame, Shield, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/reui/badge";
import { Frame, FramePanel } from "@/components/reui/frame";
import {
	Progress,
	ProgressLabel,
	ProgressValue,
} from "@/components/ui/progress";
import type { GamificationSummary } from "./types";

export function GamificationBar({ stats }: { stats: GamificationSummary }) {
	const t = useTranslations("gamification");

	return (
		<Frame>
			<FramePanel className="space-y-3">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<Badge variant="primary-light">
							<Trophy />
							{t("level", { level: stats.level })}
						</Badge>
						<Badge variant="secondary">
							{t("totalXp", { xp: stats.totalXp })}
						</Badge>
					</div>
					<div className="flex items-center gap-1.5">
						<Badge
							variant={stats.currentStreak > 0 ? "warning-light" : "outline"}
						>
							<Flame />
							{t("streak", { days: stats.currentStreak })}
						</Badge>
						<Badge variant="info-light">
							<Shield />
							{t("freezes", { count: stats.freezesAvailable })}
						</Badge>
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
		</Frame>
	);
}
