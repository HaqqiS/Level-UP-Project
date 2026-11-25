import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { BodyTrackingView } from "@/components/features/body/body-tracking-view";
import { AchievementsGrid } from "@/components/features/gamification/achievements-grid";
import { ProfileRankCard } from "@/components/features/gamification/profile-rank-card";
import { toGamificationSummary } from "@/components/features/gamification/types";
import { MetricsDashboardView } from "@/components/features/metrics/metrics-dashboard-view";
import {
	ProfileHubTabs,
	type ProfileTab,
} from "@/components/features/profile/profile-hub-tabs";
import { ProfileSettingsTab } from "@/components/features/profile/profile-settings-tab";
import { InstallPromptBanner } from "@/components/features/pwa/install-prompt-banner";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOnboarded } from "@/lib/auth/session";
import { getBodyTrackingData } from "@/server/services/body-metric-service";
import { getAchievementsForUser } from "@/server/services/gamification-service";
import { getConsistencyMetricsData } from "@/server/services/metrics-service";
import { getReminderStateForUser } from "@/server/services/push-reminder-service";

function normalizeProfileTab(raw?: string): ProfileTab {
	if (raw === "metrics" || raw === "body" || raw === "settings") return raw;
	return "overview";
}

async function ProfileDetails({
	searchParams,
}: {
	searchParams: Promise<{ tab?: string }>;
}) {
	const resolvedParams = await searchParams;
	const initialTab = normalizeProfileTab(resolvedParams.tab);
	const { session, profile } = await requireOnboarded();

	const [
		{ stats, achievements, experienceLevel },
		metricsData,
		bodyData,
		reminderState,
	] = await Promise.all([
		getAchievementsForUser(session.user.id),
		getConsistencyMetricsData(session.user.id, profile),
		getBodyTrackingData(session.user.id),
		getReminderStateForUser(session.user.id),
	]);

	const serializedStats = toGamificationSummary(stats);

	const overviewContent = (
		<>
			<ProfileRankCard
				user={{
					name: session.user.name,
					email: session.user.email,
					image: session.user.image ?? null,
				}}
				stats={serializedStats}
				achievements={achievements}
				experienceLevel={experienceLevel}
				trainingDays={profile.trainingDays}
			/>

			<AchievementsGrid
				achievements={achievements}
				equippedTitleKey={serializedStats.equippedTitleKey ?? null}
			/>
		</>
	);

	const metricsContent = <MetricsDashboardView data={metricsData} />;

	const bodyContent = (
		<BodyTrackingView
			todayKey={bodyData.todayKey}
			latestHeightCm={bodyData.latestHeightCm}
			entries={bodyData.entries}
			measurementEntries={bodyData.measurementEntries}
			measurements={bodyData.measurements}
		/>
	);

	const settingsContent = (
		<ProfileSettingsTab
			userEmail={session.user.email}
			isFemale={profile.sex === "female"}
			cycleSettings={{
				initialTracksPeriod: profile.tracksPeriod,
				initialLastPeriodStartDate: profile.lastPeriodStartDate,
				initialAverageCycleDays: profile.averageCycleDays,
				initialAveragePeriodDays: profile.averagePeriodDays,
				initialCycleRegularity: profile.cycleRegularity,
				initialLutealPhaseDays: profile.lutealPhaseDays,
				initialPeriodReminderEnabled: profile.periodReminderEnabled,
				hasPushSubscription: reminderState.subscriptionCount > 0,
			}}
			reminderSettings={{
				configured: reminderState.configured,
				publicVapidKey: reminderState.publicVapidKey,
				initialEnabled: reminderState.reminderEnabled,
				initialTime: reminderState.reminderTime,
				subscriptionCount: reminderState.subscriptionCount,
				trainingDaysCount: reminderState.trainingDaysCount,
				timezone: reminderState.timezone,
			}}
		/>
	);

	return (
		<>
			<InstallPromptBanner />
			<ProfileHubTabs
				initialTab={initialTab}
				overviewContent={overviewContent}
				metricsContent={metricsContent}
				bodyContent={bodyContent}
				settingsContent={settingsContent}
			/>
		</>
	);
}

export default async function ProfilePage({
	searchParams,
}: {
	searchParams: Promise<{ tab?: string }>;
}) {
	const t = await getTranslations("profile");
	return (
		<main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
			<h1 className="font-semibold">{t("title")}</h1>
			<Suspense
				fallback={
					<div className="flex flex-col gap-4">
						<Card size="sm">
							<CardContent className="flex flex-col gap-3">
								<div className="flex items-center gap-3">
									<Skeleton className="size-10 rounded-full" />
									<div className="flex flex-1 flex-col gap-1.5">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-3 w-44" />
									</div>
								</div>
								<Skeleton className="h-24 w-full" />
								<Skeleton className="h-16 w-full" />
							</CardContent>
						</Card>
					</div>
				}
			>
				<ProfileDetails searchParams={searchParams} />
			</Suspense>
		</main>
	);
}
