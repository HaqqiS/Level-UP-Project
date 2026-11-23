"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/reui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { WeekdayAdherenceItem } from "@/lib/metrics/consistency";

function getBarColorVar(ratePercent: number | null): string {
	if (ratePercent === null) return "var(--muted-foreground)";
	if (ratePercent >= 80) return "var(--chart-2)";
	if (ratePercent >= 50) return "var(--chart-3)";
	return "var(--chart-5)";
}

export function WeekdayAdherenceCard({
	weekdays,
	mostConsistentDay,
	mostMissedDay,
}: {
	weekdays: readonly WeekdayAdherenceItem[];
	mostConsistentDay: number | null;
	mostMissedDay: number | null;
}) {
	const t = useTranslations("metrics");
	const tDays = useTranslations("onboarding.schedule.dayNames");

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle>{t("weekdayTitle")}</CardTitle>
				<CardDescription>{t("weekdayDesc")}</CardDescription>
			</CardHeader>

			<CardContent className="space-y-2.5">
				<div className="space-y-1.5">
					{weekdays.map((item) => {
						const dayLabel = tDays(String(item.dayOfWeek) as "0");
						const pct = item.ratePercent ?? 0;

						return (
							<div
								key={item.dayOfWeek}
								className="flex items-center gap-3 rounded-2xl bg-muted/50 px-3 py-2"
							>
								<span className="w-8 shrink-0 text-xs font-medium">
									{dayLabel}
								</span>

								{item.isScheduled ? (
									<>
										<div className="h-2 flex-1 overflow-hidden rounded-full bg-background/80">
											<div
												className="h-full rounded-full transition-[width] duration-300"
												style={{
													width: `${pct}%`,
													backgroundColor: getBarColorVar(item.ratePercent),
												}}
											/>
										</div>
										<span className="w-20 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
											{item.scheduledDaysCount > 0
												? `${item.completedCount}/${item.scheduledDaysCount} · ${pct}%`
												: "—"}
										</span>
									</>
								) : (
									<>
										<div className="flex flex-1 items-center gap-1.5">
											<span className="text-xs text-muted-foreground">
												{t("weekdayRestLabel")}
											</span>
											{item.completedCount > 0 && (
												<Badge variant="primary-light" size="xs">
													{t("weekdayBonusBadge", {
														count: item.completedCount,
													})}
												</Badge>
											)}
										</div>
										<span className="w-20 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
											{item.completedCount > 0
												? `+${item.completedCount}`
												: "—"}
										</span>
									</>
								)}
							</div>
						);
					})}
				</div>

				{(mostConsistentDay !== null || mostMissedDay !== null) && (
					<div className="flex flex-wrap gap-2 pt-1">
						{mostConsistentDay !== null && (
							<Badge variant="success-light" size="sm">
								{t("weekdayBestBadge", {
									day: tDays(String(mostConsistentDay) as "0"),
								})}
							</Badge>
						)}
						{mostMissedDay !== null && (
							<Badge variant="warning-light" size="sm">
								{t("weekdayMissedBadge", {
									day: tDays(String(mostMissedDay) as "0"),
								})}
							</Badge>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
