import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { CalendarWellnessView } from "@/components/features/calendar/calendar-wellness-view";
import { Card, CardContent } from "@/components/ui/card";
import { requireOnboarded } from "@/lib/auth/session";
import { ensureTodayQuestsAndStats } from "@/server/services/gamification-service";
import { getCalendarWellnessData } from "@/server/services/wellness-service";

async function CalendarContent({
	searchParams,
}: {
	searchParams: Promise<{ month?: string; date?: string }>;
}) {
	const resolved = await searchParams;
	const { session } = await requireOnboarded();

	const [, wellnessData] = await Promise.all([
		ensureTodayQuestsAndStats(session.user.id),
		getCalendarWellnessData(session.user.id, {
			month: resolved.month,
			date: resolved.date,
		}),
	]);

	return (
		<CalendarWellnessView
			monthLabel={wellnessData.monthLabel}
			prevMonthKey={wellnessData.prevMonthKey}
			nextMonthKey={wellnessData.nextMonthKey}
			initialSelectedDateKey={wellnessData.selectedDateKey}
			tracksPeriod={wellnessData.tracksPeriod}
			cycleRegularity={wellnessData.cycleSettings.cycleRegularity}
			days={wellnessData.days}
			customItems={wellnessData.customItems}
			cycles={wellnessData.cycles}
			monthlyInsights={wellnessData.monthlyInsights}
		/>
	);
}

export default async function CalendarPage({
	searchParams,
}: {
	searchParams: Promise<{ month?: string; date?: string }>;
}) {
	const t = await getTranslations("calendar");
	return (
		<main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
			<div>
				<h1 className="font-semibold">{t("title")}</h1>
				<p className="text-sm text-muted-foreground">{t("subtitle")}</p>
			</div>
			<Suspense
				fallback={
					<Card size="sm">
						<CardContent>
							<div className="h-40 animate-pulse rounded-2xl bg-muted/40" />
						</CardContent>
					</Card>
				}
			>
				<CalendarContent searchParams={searchParams} />
			</Suspense>
		</main>
	);
}
