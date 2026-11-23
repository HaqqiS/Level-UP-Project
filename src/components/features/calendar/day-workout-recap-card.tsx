"use client";
import { CheckCircle2, Clock, Dumbbell } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/reui/badge";
import {
	Frame,
	FrameDescription,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
import type { CalendarWorkoutSummary } from "@/server/services/wellness-service";

export function DayWorkoutRecapCard({
	summary,
	isToday,
}: {
	summary: CalendarWorkoutSummary;
	isToday: boolean;
}) {
	const t = useTranslations("calendar");
	const durationMinutes =
		typeof summary.durationSeconds === "number" && summary.durationSeconds > 0
			? Math.max(1, Math.round(summary.durationSeconds / 60))
			: null;

	return (
		<Frame spacing="sm">
			<FrameHeader>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<FrameTitle className="flex items-center gap-2">
						<Dumbbell className="size-4 text-primary" />
						{summary.focus || t("recapDefaultFocus")}
					</FrameTitle>
					<Badge
						variant={summary.completed ? "success-light" : "warning-light"}
						size="sm"
					>
						<CheckCircle2 />
						{summary.completed
							? t("recapCompletedBadge")
							: t("recapInProgressBadge")}
					</Badge>
				</div>
				<FrameDescription>
					{t("recapStats", { sets: summary.setsCount })}
					{durationMinutes !== null && (
						<span className="ml-2 inline-flex items-center gap-1">
							<Clock className="inline size-3" />
							{t("recapDurationMin", { minutes: durationMinutes })}
						</span>
					)}
				</FrameDescription>
			</FrameHeader>
			{isToday && (
				<FramePanel className="pt-0">
					<Button
						size="sm"
						variant="outline"
						className="w-full"
						nativeButton={false}
						render={<Link href="/today?tab=log" />}
					>
						{t("recapOpenLogger")}
					</Button>
				</FramePanel>
			)}
		</Frame>
	);
}
