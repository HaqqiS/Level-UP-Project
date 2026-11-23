"use client";

import { BarChart3 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
	ChartLegend,
	ChartLegendContent,
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
import type { ConsistencyBucket } from "@/lib/metrics/consistency";
import { MeasuredChartBox } from "./measured-chart-box";

export function SessionsTrendChart({
	buckets,
	granularity,
	completedSessions,
	scheduledSessions,
}: {
	buckets: readonly ConsistencyBucket[];
	granularity: "day" | "week" | "month";
	completedSessions: number;
	scheduledSessions: number;
}) {
	const t = useTranslations("metrics");

	const chartConfig = {
		scheduled: {
			label: t("legendScheduled"),
			color: "var(--chart-3)",
		},
		completed: {
			label: t("legendCompleted"),
			color: "var(--chart-2)",
		},
	} satisfies ChartConfig;

	const hasData = buckets.some((b) => b.scheduled > 0 || b.completed > 0);

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle>{t("sessionsChartTitle")}</CardTitle>
				<CardDescription>
					{t(`sessionsChartDesc.${granularity}`)}
				</CardDescription>
				<CardAction>
					<Badge variant="secondary" size="sm" className="tabular-nums">
						{completedSessions}/{scheduledSessions}
					</Badge>
				</CardAction>
			</CardHeader>

			<CardContent>
				{!hasData ? (
					<Empty className="p-8">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<BarChart3 />
							</EmptyMedia>
							<EmptyTitle>{t("sessionsEmptyTitle")}</EmptyTitle>
							<EmptyDescription>{t("sessionsEmptyDesc")}</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					<MeasuredChartBox active={hasData}>
						<ChartContainer
							config={chartConfig}
							className="min-h-[210px] w-full"
						>
							<BarChart
								accessibilityLayer
								data={[...buckets]}
								margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
							>
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
									width={32}
								/>
								<ChartTooltip
									content={<ChartTooltipContent indicator="dot" />}
								/>
								<ChartLegend content={<ChartLegendContent />} />
								<Bar
									dataKey="scheduled"
									fill="var(--color-scheduled)"
									radius={[4, 4, 0, 0]}
									maxBarSize={18}
								/>
								<Bar
									dataKey="completed"
									fill="var(--color-completed)"
									radius={[4, 4, 0, 0]}
									maxBarSize={18}
								/>
							</BarChart>
						</ChartContainer>
					</MeasuredChartBox>
				)}
			</CardContent>
		</Card>
	);
}
