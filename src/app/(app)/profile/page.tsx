import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { BodyTrackingView } from "@/components/features/body/body-tracking-view";
import { AchievementsGrid } from "@/components/features/gamification/achievements-grid";
import {
	ProfileHubTabs,
	type ProfileTab,
} from "@/components/features/profile/profile-hub-tabs";
import { ProfileSettingsTab } from "@/components/features/profile/profile-settings-tab";
import { InstallPromptBanner } from "@/components/features/pwa/install-prompt-banner";
import { Badge } from "@/components/reui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { requireOnboarded } from "@/lib/auth/session";
import { getBodyTrackingData } from "@/server/services/body-metric-service";
import { getAchievementsForUser } from "@/server/services/gamification-service";
import { getReminderStateForUser } from "@/server/services/push-reminder-service";

function getInitials(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
}

function normalizeProfileTab(raw?: string): ProfileTab {
	if (raw === "body" || raw === "settings") return raw;
	return "overview";
}

async function ProfileDetails({
	searchParams,
}: {
	searchParams: Promise<{ tab?: string }>;
}) {
	const t = await getTranslations();
	const resolvedParams = await searchParams;
	const initialTab = normalizeProfileTab(resolvedParams.tab);
	const { session, profile } = await requireOnboarded();

	const [{ achievements }, bodyData, reminderState] = await Promise.all([
		getAchievementsForUser(session.user.id),
		getBodyTrackingData(session.user.id),
		getReminderStateForUser(session.user.id),
	]);

	const overviewContent = (
		<>
			<Card size="sm">
				<CardContent className="space-y-3">
					<div className="flex items-center gap-3">
						<Avatar size="lg">
							{session.user.image && (
								<AvatarImage src={session.user.image} alt={session.user.name} />
							)}
							<AvatarFallback>{getInitials(session.user.name)}</AvatarFallback>
						</Avatar>
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold">
								{session.user.name}
							</p>
							<p className="truncate text-xs text-muted-foreground">
								{session.user.email}
							</p>
						</div>
					</div>

					<div className="space-y-2.5 rounded-2xl bg-muted/50 p-3">
						<div className="flex items-center justify-between gap-2 text-sm">
							<span className="text-muted-foreground">
								{t("profile.level")}
							</span>
							<Badge variant="secondary">
								{t(`onboarding.experience.${profile.experienceLevel}`)}
							</Badge>
						</div>
						<div className="flex items-center justify-between gap-2 text-sm">
							<span className="shrink-0 text-muted-foreground">
								{t("profile.days")}
							</span>
							<div className="flex flex-wrap justify-end gap-1">
								{profile.trainingDays.map((day) => (
									<Badge key={day} variant="outline">
										{t(
											`onboarding.schedule.dayNames.${day}` as "onboarding.schedule.dayNames.0",
										)}
									</Badge>
								))}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<AchievementsGrid achievements={achievements} />
		</>
	);

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
					<Card size="sm">
						<CardContent>
							<div className="h-24 animate-pulse rounded-2xl bg-muted/40" />
						</CardContent>
					</Card>
				}
			>
				<ProfileDetails searchParams={searchParams} />
			</Suspense>
		</main>
	);
}
