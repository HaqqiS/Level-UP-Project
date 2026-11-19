"use client";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/reui/badge";
import {
	Frame,
	FrameDescription,
	FramePanel,
	FrameTitle,
} from "@/components/reui/frame";
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
		<Frame spacing="sm">
			<div className="grid grid-cols-2 gap-1.5">
				<FramePanel className="space-y-1">
					<FrameDescription>{t("currentWeight")}</FrameDescription>
					<FrameTitle>
						{summary.currentWeightKg !== null
							? t("kgUnit", { val: summary.currentWeightKg.toFixed(1) })
							: "—"}
					</FrameTitle>
				</FramePanel>

				<FramePanel className="space-y-1">
					<FrameDescription>{t("periodChange")}</FrameDescription>
					<div>
						<Badge variant={deltaVariant}>
							{summary.deltaKg !== null
								? `${deltaSign}${summary.deltaKg.toFixed(1)} kg`
								: "—"}
						</Badge>
					</div>
				</FramePanel>

				<FramePanel className="space-y-1">
					<FrameDescription>{t("heightLabel")}</FrameDescription>
					<FrameTitle>
						{latestHeightCm !== null
							? t("cmUnit", { val: Math.round(latestHeightCm) })
							: "—"}
					</FrameTitle>
				</FramePanel>

				<FramePanel className="space-y-1">
					<FrameDescription>{t("bmiLabel")}</FrameDescription>
					<FrameTitle>
						{summary.bmi !== null ? summary.bmi.toFixed(1) : "—"}
					</FrameTitle>
				</FramePanel>
			</div>
		</Frame>
	);
}
