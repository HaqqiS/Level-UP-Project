"use client";
import { Minus, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/reui/badge";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { WeightEntryPoint, WeightSummary } from "@/lib/body/metrics";

function formatShortDate(dateKey: string): string {
	const [, month, day] = dateKey.split("-");
	return `${day}/${month}`;
}

export function WeightTrendChart({
	series,
	summary,
	range,
	onRangeChange,
}: {
	series: readonly WeightEntryPoint[];
	summary: WeightSummary;
	range: 30 | 90;
	onRangeChange: (days: 30 | 90) => void;
}) {
	const t = useTranslations("body");
	const containerRef = useRef<HTMLDivElement>(null);
	const [isMeasured, setIsMeasured] = useState(false);
	const hasSeries = series.length > 0;

	useEffect(() => {
		const el = containerRef.current;
		if (!hasSeries || !el) {
			setIsMeasured(false);
			return;
		}

		const updateMeasurement = () => {
			const next = el.clientWidth > 0 && el.clientHeight > 0;
			setIsMeasured((prev) => (prev === next ? prev : next));
		};

		updateMeasurement();

		if (typeof ResizeObserver === "undefined") {
			return;
		}

		const observer = new ResizeObserver(updateMeasurement);
		observer.observe(el);

		return () => observer.disconnect();
	}, [hasSeries]);

	const chartConfig = {
		valueKg: {
			label: t("weightSeriesLabel"),
			color: "var(--chart-1)",
		},
	} satisfies ChartConfig;

	const delta = summary.deltaKg;
	const DeltaIcon =
		delta === null || delta === 0
			? Minus
			: delta < 0
				? TrendingDown
				: TrendingUp;
	const deltaSign = delta !== null && delta > 0 ? "+" : "";

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex flex-wrap items-center gap-2">
					<span>{t("chartTitle")}</span>
					{delta !== null && (
						<Badge
							variant={
								delta === 0
									? "secondary"
									: delta < 0
										? "success-light"
										: "info-light"
							}
							size="sm"
						>
							<DeltaIcon />
							{deltaSign}
							{delta.toFixed(1)} kg
						</Badge>
					)}
				</CardTitle>
				<CardDescription>
					{t("chartDescription", { days: range })}
				</CardDescription>
				<CardAction>
					<ToggleGroup
						variant="outline"
						size="sm"
						value={[String(range)]}
						onValueChange={(vals) => {
							const next = vals[0];
							if (next === "30" || next === "90") {
								onRangeChange(Number(next) as 30 | 90);
							}
						}}
					>
						<ToggleGroupItem value="30">{t("range30")}</ToggleGroupItem>
						<ToggleGroupItem value="90">{t("range90")}</ToggleGroupItem>
					</ToggleGroup>
				</CardAction>
			</CardHeader>

			<CardContent>
				{series.length === 0 ? (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<Scale />
							</EmptyMedia>
							<EmptyTitle>{t("emptyTitle")}</EmptyTitle>
							<EmptyDescription>{t("emptyDescription")}</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					<div ref={containerRef} className="min-h-[200px] w-full">
						{isMeasured ? (
							<ChartContainer
								config={chartConfig}
								className="min-h-[200px] w-full"
							>
								<AreaChart
									accessibilityLayer
									data={[...series]}
									margin={{ top: 12, right: 8, bottom: 0, left: -16 }}
								>
									<defs>
										<linearGradient
											id="weight-area-fill"
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
											<stop
												offset="5%"
												stopColor="var(--color-valueKg)"
												stopOpacity={0.35}
											/>
											<stop
												offset="95%"
												stopColor="var(--color-valueKg)"
												stopOpacity={0.02}
											/>
										</linearGradient>
									</defs>
									<CartesianGrid vertical={false} strokeDasharray="3 3" />
									<XAxis
										dataKey="dateKey"
										tickLine={false}
										axisLine={false}
										tickMargin={8}
										tickFormatter={formatShortDate}
									/>
									<YAxis
										tickLine={false}
										axisLine={false}
										domain={["dataMin - 2", "dataMax + 2"]}
										tickFormatter={(v) => `${v}`}
									/>
									<ChartTooltip
										cursor={false}
										content={
											<ChartTooltipContent
												indicator="dot"
												labelFormatter={(label) => String(label)}
											/>
										}
									/>
									<Area
										type="monotone"
										dataKey="valueKg"
										stroke="var(--color-valueKg)"
										strokeWidth={2}
										fill="url(#weight-area-fill)"
										dot={{ r: 3 }}
										activeDot={{ r: 5 }}
									/>
								</AreaChart>
							</ChartContainer>
						) : (
							<div
								aria-hidden="true"
								className="aspect-video min-h-[200px] w-full"
							/>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
