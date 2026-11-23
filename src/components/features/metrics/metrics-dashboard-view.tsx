"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	type ConsistencyDashboardInput,
	computeConsistencyMetrics,
	METRIC_TIMEFRAMES,
	type MetricTimeframe,
} from "@/lib/metrics/consistency";
import { ConsistencyHeatmapCard } from "./consistency-heatmap-card";
import { ConsistencyKpiCard } from "./consistency-kpi-card";
import { DurationTrendChart } from "./duration-trend-chart";
import { SessionsTrendChart } from "./sessions-trend-chart";
import { WeekdayAdherenceCard } from "./weekday-adherence-card";

export function MetricsDashboardView({
	data,
}: {
	data: ConsistencyDashboardInput;
}) {
	const t = useTranslations("metrics");
	const [timeframe, setTimeframe] = useState<MetricTimeframe>("30d");

	const metrics = useMemo(
		() => computeConsistencyMetrics(data, timeframe),
		[data, timeframe],
	);

	return (
		<div className="flex flex-col gap-4">
			<Card size="sm">
				<CardContent className="space-y-2.5">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<p className="text-sm font-medium">{t("timeframeTitle")}</p>
						<span className="text-xs text-muted-foreground tabular-nums">
							{t("rangeLabel", {
								start: metrics.effectiveStartKey,
								end: metrics.rangeEndKey,
							})}
						</span>
					</div>

					<ToggleGroup
						variant="outline"
						size="sm"
						className="w-full"
						value={[timeframe]}
						onValueChange={(vals) => {
							const next = vals[0];
							if (next && METRIC_TIMEFRAMES.includes(next as MetricTimeframe)) {
								setTimeframe(next as MetricTimeframe);
							}
						}}
					>
						{METRIC_TIMEFRAMES.map((tf) => (
							<ToggleGroupItem key={tf} value={tf} className="flex-1">
								{t(`timeframes.${tf}`)}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
				</CardContent>
			</Card>

			<ConsistencyKpiCard kpis={metrics.kpis} />

			<SessionsTrendChart
				buckets={metrics.buckets}
				granularity={metrics.bucketGranularity}
				completedSessions={metrics.kpis.completedSessions}
				scheduledSessions={metrics.kpis.scheduledSessions}
			/>

			<DurationTrendChart
				buckets={metrics.buckets}
				granularity={metrics.bucketGranularity}
				avgDurationSeconds={metrics.kpis.avgDurationSeconds}
				timedSessionsCount={metrics.kpis.timedSessionsCount}
				sessionMinutesTarget={metrics.kpis.sessionMinutesTarget}
				scheduledDaysPerWeek={data.scheduledDays.length}
			/>

			<ConsistencyHeatmapCard
				cells={metrics.heatmapCells}
				timeframe={metrics.timeframe}
				weeksCount={metrics.heatmapWeeksCount}
				clipped={metrics.heatmapClipped}
				onScheduleSessions={metrics.kpis.onScheduleSessions}
				bonusSessions={metrics.kpis.bonusSessions}
				freezesUsedInPeriod={metrics.kpis.freezesUsedInPeriod}
			/>

			<WeekdayAdherenceCard
				weekdays={metrics.weekdays}
				mostConsistentDay={metrics.mostConsistentDay}
				mostMissedDay={metrics.mostMissedDay}
			/>
		</div>
	);
}
