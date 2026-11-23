"use client";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/reui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { WeightSummary } from "@/lib/body/metrics";

export function BodySummaryCards({
	summary,
	latestHeightCm,
}: {
	summary: WeightSummary;
	latestHeightCm: number | null;
}) {
	const t = useTranslations("body");

	const deltaSign = summary.deltaKg !== null && summary.deltaKg > 0 ? "+" : "";
	const deltaVariant =
		summary.deltaKg === null || summary.deltaKg === 0
			? "secondary"
			: summary.deltaKg < 0
				? "success-light"
				: "info-light";

	return (
		<Card size="sm">
			<CardContent>
				<div className="grid grid-cols-2 gap-2">
					<div className="space-y-1 rounded-2xl bg-muted/50 px-3 py-2.5">
						<p className="text-xs text-muted-foreground">
							{t("currentWeight")}
						</p>
						<p className="text-sm font-semibold">
							{summary.currentWeightKg !== null
								? t("kgUnit", { val: summary.currentWeightKg.toFixed(1) })
								: "—"}
						</p>
					</div>

					<div className="space-y-1 rounded-2xl bg-muted/50 px-3 py-2.5">
						<p className="text-xs text-muted-foreground">{t("periodChange")}</p>
						<div>
							<Badge variant={deltaVariant}>
								{summary.deltaKg !== null
									? `${deltaSign}${summary.deltaKg.toFixed(1)} kg`
									: "—"}
							</Badge>
						</div>
					</div>

					<div className="space-y-1 rounded-2xl bg-muted/50 px-3 py-2.5">
						<p className="text-xs text-muted-foreground">{t("heightLabel")}</p>
						<p className="text-sm font-semibold">
							{latestHeightCm !== null
								? t("cmUnit", { val: Math.round(latestHeightCm) })
								: "—"}
						</p>
					</div>

					<div className="space-y-1 rounded-2xl bg-muted/50 px-3 py-2.5">
						<p className="text-xs text-muted-foreground">{t("bmiLabel")}</p>
						<p className="text-sm font-semibold">
							{summary.bmi !== null ? summary.bmi.toFixed(1) : "—"}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
