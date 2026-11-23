"use client";
import { useMemo, useState } from "react";
import {
	computeWeightSummary,
	filterWeightSeriesByDays,
} from "@/lib/body/metrics";
import { BodySummaryCards } from "./body-summary-cards";
import { MeasurementsCard } from "./measurements-card";
import type { BodyTrackingViewProps } from "./types";
import { WeightLogForm } from "./weight-log-form";
import { WeightTrendChart } from "./weight-trend-chart";

export function BodyTrackingView({
	todayKey,
	latestHeightCm,
	entries,
	measurementEntries,
	measurements,
}: BodyTrackingViewProps) {
	const [range, setRange] = useState<30 | 90>(30);

	const series = useMemo(
		() => filterWeightSeriesByDays(entries, range, todayKey),
		[entries, range, todayKey],
	);

	const latestWeightKg = entries[0]?.valueKg ?? null;
	const summary = useMemo(
		() =>
			computeWeightSummary({
				series,
				latestWeightKg,
				latestHeightCm,
			}),
		[series, latestWeightKg, latestHeightCm],
	);

	return (
		<div className="flex flex-col gap-4">
			<BodySummaryCards summary={summary} latestHeightCm={latestHeightCm} />
			<WeightTrendChart
				series={series}
				summary={summary}
				range={range}
				onRangeChange={setRange}
			/>
			<WeightLogForm latestWeightKg={latestWeightKg} entries={entries} />
			<MeasurementsCard
				measurements={measurements}
				entries={measurementEntries}
			/>
		</div>
	);
}
