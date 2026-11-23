"use client";

import { Flame, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/reui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
	type ConsistencyKpiSummary,
	formatCompactDuration,
} from "@/lib/metrics/consistency";

function getDeltaVariant(delta: number) {
	if (delta > 0) return "success-light" as const;
	if (delta < 0) return "destructive-light" as const;
	return "secondary" as const;
}

export function ConsistencyKpiCard({ kpis }: { kpis: ConsistencyKpiSummary }) {
	const t = useTranslations("metrics");

	const showDurationDelta =
		kpis.durationDeltaSeconds !== null &&
		(kpis.timedSessionsCount > 0 || kpis.durationDeltaSeconds !== 0);

	return (
		<Card size="sm">
			<CardContent>
				<div className="grid grid-cols-2 gap-2">
					<div className="space-y-1 rounded-2xl bg-muted/50 px-3 py-2.5">
						<p className="text-xs text-muted-foreground">{t("kpiAdherence")}</p>
						<div className="flex flex-wrap items-center gap-1.5">
							<span className="text-base font-semibold tabular-nums">
								{kpis.adherencePercent !== null
									? `${kpis.adherencePercent}%`
									: "—"}
							</span>
							{kpis.adherenceDelta !== null && (
								<Badge variant={getDeltaVariant(kpis.adherenceDelta)} size="xs">
									{kpis.adherenceDelta > 0
										? `+${kpis.adherenceDelta}%`
										: `${kpis.adherenceDelta}%`}
								</Badge>
							)}
						</div>
						<p className="text-[11px] text-muted-foreground tabular-nums">
							{t("kpiAdherenceSub", {
								completed: kpis.completedSessions,
								scheduled: kpis.scheduledSessions,
							})}
						</p>
					</div>

					<div className="space-y-1 rounded-2xl bg-muted/50 px-3 py-2.5">
						<p className="text-xs text-muted-foreground">{t("kpiSessions")}</p>
						<div className="flex flex-wrap items-center gap-1.5">
							<span className="text-base font-semibold tabular-nums">
								{kpis.completedSessions}
							</span>
							{kpis.completedDelta !== null && (
								<Badge variant={getDeltaVariant(kpis.completedDelta)} size="xs">
									{kpis.completedDelta > 0
										? `+${kpis.completedDelta}`
										: `${kpis.completedDelta}`}
								</Badge>
							)}
						</div>
						<p className="text-[11px] text-muted-foreground tabular-nums">
							{t("kpiSessionsPerWeek", {
								rate: kpis.sessionsPerWeek.toFixed(1),
							})}
						</p>
					</div>

					<div className="space-y-1 rounded-2xl bg-muted/50 px-3 py-2.5">
						<p className="text-xs text-muted-foreground">{t("kpiDuration")}</p>
						<div className="flex flex-wrap items-center gap-1.5">
							<span className="text-base font-semibold tabular-nums">
								{formatCompactDuration(kpis.totalDurationSeconds)}
							</span>
							{showDurationDelta && kpis.durationDeltaSeconds !== null && (
								<Badge
									variant={getDeltaVariant(kpis.durationDeltaSeconds)}
									size="xs"
								>
									{kpis.durationDeltaSeconds > 0
										? `+${formatCompactDuration(kpis.durationDeltaSeconds)}`
										: kpis.durationDeltaSeconds < 0
											? `−${formatCompactDuration(Math.abs(kpis.durationDeltaSeconds))}`
											: "0m"}
								</Badge>
							)}
						</div>
						<p className="text-[11px] text-muted-foreground tabular-nums">
							{kpis.avgDurationSeconds !== null
								? t("kpiAvgVsTarget", {
										avg: formatCompactDuration(kpis.avgDurationSeconds),
										target: kpis.sessionMinutesTarget,
									})
								: t("kpiTargetOnly", { target: kpis.sessionMinutesTarget })}
						</p>
					</div>

					<div className="space-y-1 rounded-2xl bg-muted/50 px-3 py-2.5">
						<p className="text-xs text-muted-foreground">{t("kpiStreak")}</p>
						<div className="flex flex-wrap items-center gap-1.5">
							<span className="inline-flex items-center gap-1 text-base font-semibold tabular-nums">
								<Flame className="size-3.5 text-warning" aria-hidden="true" />
								{t("kpiStreakDays", { days: kpis.currentStreak })}
							</span>
							{kpis.longestStreak > 0 && (
								<Badge variant="outline" size="xs">
									{t("kpiBestStreak", { days: kpis.longestStreak })}
								</Badge>
							)}
						</div>
						<div className="pt-0.5">
							<Badge
								variant={kpis.freezeReady ? "info-light" : "warning-light"}
								size="xs"
							>
								<Shield />
								{kpis.freezeReady ? t("kpiFreezeReady") : t("kpiFreezeUsed")}
							</Badge>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
