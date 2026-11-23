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
import {
	Frame,
	FrameDescription,
	FramePanel,
	FrameTitle,
} from "@/components/reui/frame";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
			<Frame>
				<FramePanel className="flex items-center gap-3">
					<Avatar size="lg">
						{session.user.image && (
							<AvatarImage src={session.user.image} alt={session.user.name} />
						)}
						<AvatarFallback>{getInitials(session.user.name)}</AvatarFallback>
					</Avatar>
					<div className="min-w-0">
						<FrameTitle className="truncate">{session.user.name}</FrameTitle>
						<FrameDescription className="truncate">
							{session.user.email}
						</FrameDescription>
					</div>
				</FramePanel>

				<FramePanel className="flex flex-col gap-3">
					<div className="flex items-center justify-between gap-2 text-sm">
						<span className="text-muted-foreground">{t("profile.level")}</span>
						<Badge variant="secondary">
							{t(`onboarding.experience.${profile.experienceLevel}`)}
						</Badge>
					</div>
					<div className="flex items-start justify-between gap-2 text-sm">
						<span className="text-muted-foreground">{t("profile.days")}</span>
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
				</FramePanel>
			</Frame>

			<AchievementsGrid achievements={achievements} />
		</>
	);

	const bodyContent = (
		<BodyTrackingView
			todayKey={bodyData.todayKey}
			latestHeightCm={bodyData.latestHeightCm}
			entries={bodyData.entries}
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
					<Frame>
						<FramePanel className="h-32" />
					</Frame>
				}
			>
				<ProfileDetails searchParams={searchParams} />
			</Suspense>
		</main>
	);
}
