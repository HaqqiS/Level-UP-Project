"use client";

import { cn } from "cn";
import { CalendarDays, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ConsistencyHeatmapCell,
	type ConsistencyHeatmapCellStatus,
	formatCompactDuration,
	type MetricTimeframe,
} from "@/lib/metrics/consistency";

function getCellSurfaceClass(status: ConsistencyHeatmapCellStatus): string {
	switch (status) {
		case "completed":
			return "bg-(--chart-2) text-white";
		case "frozen":
			return "bg-(--chart-4) text-white";
		case "missed":
			return "bg-(--chart-5)/30 text-foreground";
		case "pending":
			return "border border-dashed border-(--chart-3) bg-muted/60 text-foreground";
		case "rest":
			return "bg-muted/70 text-muted-foreground";
		case "before_join":
		case "future":
			return "bg-muted/25 text-muted-foreground/40";
	}
}

function getStatusBadgeVariant(status: ConsistencyHeatmapCellStatus) {
	switch (status) {
		case "completed":
			return "success-light" as const;
		case "frozen":
			return "info-light" as const;
		case "missed":
			return "destructive-light" as const;
		case "pending":
			return "warning-light" as const;
		default:
			return "secondary" as const;
	}
}

function isInteractiveStatus(status: ConsistencyHeatmapCellStatus): boolean {
	return status !== "future" && status !== "before_join";
}

export function ConsistencyHeatmapCard({
	cells,
	timeframe,
	weeksCount,
	clipped,
	onScheduleSessions,
	bonusSessions,
	freezesUsedInPeriod,
}: {
	cells: readonly ConsistencyHeatmapCell[];
	timeframe: MetricTimeframe;
	weeksCount: number;
	clipped: boolean;
	onScheduleSessions: number;
	bonusSessions: number;
	freezesUsedInPeriod: number;
}) {
	const t = useTranslations("metrics");
	const tDays = useTranslations("onboarding.schedule.dayNames");

	const defaultSelectedKey =
		cells.find((c) => c.isToday && isInteractiveStatus(c.status))?.dateKey ??
		[...cells].reverse().find((c) => isInteractiveStatus(c.status))?.dateKey ??
		null;

	const [selectedDateKey, setSelectedDateKey] = useState<string | null>(
		defaultSelectedKey,
	);

	useEffect(() => {
		setSelectedDateKey((prev) => {
			if (
				prev &&
				cells.some((c) => c.dateKey === prev && isInteractiveStatus(c.status))
			) {
				return prev;
			}
			return defaultSelectedKey;
		});
	}, [cells, defaultSelectedKey]);

	const selectedCell =
		cells.find(
			(c) => c.dateKey === selectedDateKey && isInteractiveStatus(c.status),
		) ?? null;

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle>{t("heatmapTitle")}</CardTitle>
				<CardDescription>
					{clipped ? t("heatmapDescClipped") : t("heatmapDesc")}
				</CardDescription>
				<CardAction>
					<Button variant="ghost" size="xs" render={<Link href="/calendar" />}>
						<CalendarDays />
						{t("heatmapOpenCalendar")}
						<ChevronRight />
					</Button>
				</CardAction>
			</CardHeader>

			<CardContent className="space-y-3">
				{timeframe === "7d" ? (
					<div className="grid grid-cols-7 gap-1.5">
						{cells.map((cell) => {
							const interactive = isInteractiveStatus(cell.status);
							const selected = selectedCell?.dateKey === cell.dateKey;
							const dayNum = cell.dateKey.slice(8);
							const statusClass = getCellSurfaceClass(cell.status);

							if (!interactive) {
								return (
									<div
										key={cell.dateKey}
										aria-hidden="true"
										className={cn(
											"flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-center",
											statusClass,
										)}
									>
										<span className="text-[10px]">
											{tDays(String(cell.dayOfWeek) as "0")}
										</span>
										<span className="text-xs font-medium tabular-nums">
											{dayNum}
										</span>
									</div>
								);
							}

							return (
								<button
									key={cell.dateKey}
									type="button"
									aria-pressed={selected}
									aria-label={`${cell.dateKey}: ${t(`heatmapStatus.${cell.status}`)}`}
									onClick={() => setSelectedDateKey(cell.dateKey)}
									className={cn(
										"flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
										statusClass,
										selected &&
											"ring-2 ring-foreground/80 ring-offset-1 ring-offset-card",
									)}
								>
									<span className="text-[10px] opacity-85">
										{tDays(String(cell.dayOfWeek) as "0")}
									</span>
									<span className="text-xs font-semibold tabular-nums">
										{dayNum}
									</span>
								</button>
							);
						})}
					</div>
				) : (
					<div className="flex items-stretch justify-center gap-2">
						<div className="grid shrink-0 grid-rows-7 gap-1 text-[10px] leading-none text-muted-foreground">
							<span className="flex items-center">{tDays("1")}</span>
							<span aria-hidden="true" />
							<span className="flex items-center">{tDays("3")}</span>
							<span aria-hidden="true" />
							<span className="flex items-center">{tDays("5")}</span>
							<span aria-hidden="true" />
							<span className="flex items-center">{tDays("0")}</span>
						</div>

						<div
							className="min-w-0 flex-1"
							style={{ maxWidth: `${weeksCount * 28}px` }}
						>
							<div
								className="grid w-full grid-flow-col grid-rows-7 gap-1"
								style={{
									gridTemplateColumns: `repeat(${weeksCount}, minmax(0, 1fr))`,
								}}
							>
								{cells.map((cell) => {
									const interactive = isInteractiveStatus(cell.status);
									const selected = selectedCell?.dateKey === cell.dateKey;
									const statusClass = getCellSurfaceClass(cell.status);

									if (!interactive) {
										return (
											<div
												key={cell.dateKey}
												aria-hidden="true"
												className={cn(
													"aspect-square rounded-[4px]",
													statusClass,
												)}
											/>
										);
									}

									return (
										<button
											key={cell.dateKey}
											type="button"
											aria-pressed={selected}
											aria-label={`${cell.dateKey}: ${t(`heatmapStatus.${cell.status}`)}`}
											onClick={() => setSelectedDateKey(cell.dateKey)}
											className={cn(
												"aspect-square rounded-[4px] transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
												statusClass,
												selected &&
													"ring-2 ring-foreground/80 ring-offset-1 ring-offset-card",
											)}
										/>
									);
								})}
							</div>
						</div>
					</div>
				)}

				{selectedCell && (
					<div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-muted/50 px-3 py-2 text-xs">
						<div className="flex items-center gap-2">
							<span className="font-medium tabular-nums">
								{selectedCell.dateKey}
							</span>
							<Badge
								variant={getStatusBadgeVariant(selectedCell.status)}
								size="xs"
							>
								{t(`heatmapStatus.${selectedCell.status}`)}
							</Badge>
						</div>
						<span className="text-muted-foreground tabular-nums">
							{selectedCell.status === "completed"
								? t("heatmapCellStats", {
										sets: selectedCell.setsCount,
										duration:
											selectedCell.durationSeconds !== null &&
											selectedCell.durationSeconds > 0
												? formatCompactDuration(selectedCell.durationSeconds)
												: "—",
									})
								: t("heatmapCellTapHint")}
						</span>
					</div>
				)}

				<div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-muted-foreground">
					<span className="inline-flex items-center gap-1.5">
						<span className="size-2.5 rounded-xs bg-(--chart-2)" />
						{t("heatmapLegendDone")}
					</span>
					<span className="inline-flex items-center gap-1.5">
						<span className="size-2.5 rounded-xs bg-(--chart-4)" />
						{t("heatmapLegendFreeze")}
					</span>
					<span className="inline-flex items-center gap-1.5">
						<span className="size-2.5 rounded-xs bg-(--chart-5)/30" />
						{t("heatmapLegendMissed")}
					</span>
					<span className="inline-flex items-center gap-1.5">
						<span className="size-2.5 rounded-xs bg-muted/70 ring-1 ring-border/50" />
						{t("heatmapLegendRest")}
					</span>
				</div>

				<div className="grid grid-cols-3 gap-2">
					<div className="rounded-2xl bg-muted/50 px-2.5 py-2 text-center">
						<p className="text-[11px] text-muted-foreground">
							{t("heatmapOnSchedule")}
						</p>
						<p className="text-sm font-semibold tabular-nums">
							{onScheduleSessions}
						</p>
					</div>
					<div className="rounded-2xl bg-muted/50 px-2.5 py-2 text-center">
						<p className="text-[11px] text-muted-foreground">
							{t("heatmapBonus")}
						</p>
						<p className="text-sm font-semibold tabular-nums">
							{bonusSessions}
						</p>
					</div>
					<div className="rounded-2xl bg-muted/50 px-2.5 py-2 text-center">
						<p className="text-[11px] text-muted-foreground">
							{t("heatmapFreezes")}
						</p>
						<p className="text-sm font-semibold tabular-nums">
							{freezesUsedInPeriod}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
