"use client";

import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ReferenceLine,
	XAxis,
	YAxis,
} from "recharts";
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
import {
	type ConsistencyBucket,
	formatCompactDuration,
} from "@/lib/metrics/consistency";
import { MeasuredChartBox } from "./measured-chart-box";

export function DurationTrendChart({
	buckets,
	granularity,
	avgDurationSeconds,
	timedSessionsCount,
	sessionMinutesTarget,
	scheduledDaysPerWeek,
}: {
	buckets: readonly ConsistencyBucket[];
	granularity: "day" | "week" | "month";
	avgDurationSeconds: number | null;
	timedSessionsCount: number;
	sessionMinutesTarget: number;
	scheduledDaysPerWeek: number;
}) {
	const t = useTranslations("metrics");

	const chartConfig = {
		durationMinutes: {
			label: t("durationSeriesLabel"),
			color: "var(--chart-1)",
		},
	} satisfies ChartConfig;

	const referenceTargetMinutes =
		granularity === "day"
			? sessionMinutesTarget
			: granularity === "week" && scheduledDaysPerWeek > 0
				? scheduledDaysPerWeek * sessionMinutesTarget
				: null;

	const maxMinutes = buckets.reduce(
		(max, item) => Math.max(max, item.durationMinutes),
		referenceTargetMinutes ?? 0,
	);

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle>{t("durationChartTitle")}</CardTitle>
				<CardDescription>
					{referenceTargetMinutes !== null
						? t("durationChartDescWithTarget", {
								target: referenceTargetMinutes,
							})
						: t("durationChartDesc")}
				</CardDescription>
				{avgDurationSeconds !== null && timedSessionsCount > 0 && (
					<CardAction>
						<Badge variant="secondary" size="sm" className="tabular-nums">
							{t("durationAvgBadge", {
								avg: formatCompactDuration(avgDurationSeconds),
							})}
						</Badge>
					</CardAction>
				)}
			</CardHeader>

			<CardContent>
				{timedSessionsCount === 0 ? (
					<Empty className="p-8">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<Clock />
							</EmptyMedia>
							<EmptyTitle>{t("durationEmptyTitle")}</EmptyTitle>
							<EmptyDescription>{t("durationEmptyDesc")}</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					<MeasuredChartBox active={timedSessionsCount > 0}>
						<ChartContainer
							config={chartConfig}
							className="min-h-[200px] w-full"
						>
							<AreaChart
								accessibilityLayer
								data={[...buckets]}
								margin={{ top: 12, right: 8, bottom: 0, left: -12 }}
							>
								<defs>
									<linearGradient
										id="metrics-duration-fill"
										x1="0"
										y1="0"
										x2="0"
										y2="1"
									>
										<stop
											offset="5%"
											stopColor="var(--color-durationMinutes)"
											stopOpacity={0.35}
										/>
										<stop
											offset="95%"
											stopColor="var(--color-durationMinutes)"
											stopOpacity={0.02}
										/>
									</linearGradient>
								</defs>
								<CartesianGrid vertical={false} strokeDasharray="3 3" />
								<XAxis
									dataKey="label"
									tickLine={false}
									axisLine={false}
									tickMargin={8}
									minTickGap={16}
								/>
								<YAxis
									tickLine={false}
									axisLine={false}
									allowDecimals={false}
									width={38}
									domain={[0, Math.max(20, Math.ceil(maxMinutes * 1.15))]}
									tickFormatter={(v) => `${v}m`}
								/>
								<ChartTooltip
									cursor={false}
									content={<ChartTooltipContent indicator="dot" />}
								/>
								{referenceTargetMinutes !== null &&
									referenceTargetMinutes > 0 && (
										<ReferenceLine
											y={referenceTargetMinutes}
											stroke="var(--chart-3)"
											strokeDasharray="4 4"
											strokeWidth={1.5}
										/>
									)}
								<Area
									type="monotone"
									dataKey="durationMinutes"
									stroke="var(--color-durationMinutes)"
									strokeWidth={2}
									fill="url(#metrics-duration-fill)"
									dot={{ r: 3 }}
									activeDot={{ r: 5 }}
								/>
							</AreaChart>
						</ChartContainer>
					</MeasuredChartBox>
				)}
			</CardContent>
		</Card>
	);
}
