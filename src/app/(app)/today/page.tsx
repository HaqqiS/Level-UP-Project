import { Swords } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { DailyQuestsCard } from "@/components/features/gamification/daily-quests-card";
import { GamificationBar } from "@/components/features/gamification/gamification-bar";
import { GeneratePlanButton } from "@/components/features/plan/generate-plan-button";
import { TodaySessionCard } from "@/components/features/plan/today-session-card";
import { Frame, FramePanel } from "@/components/reui/frame";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { requireOnboarded } from "@/lib/auth/session";
import { ensureTodayQuestsAndStats } from "@/server/services/gamification-service";
import { getCurrentPlanPageData } from "@/server/services/weekly-plan-service";

async function TodayContent() {
	const t = await getTranslations("today");
	const { session, profile } = await requireOnboarded();

	const [{ allExercises }, { todaySession, todayLog, quests, stats }] =
		await Promise.all([
			getCurrentPlanPageData(session.user.id, profile.timezone),
			ensureTodayQuestsAndStats(session.user.id),
		]);

	const gamificationBar = <GamificationBar stats={stats} />;
	const isRestDay = todaySession ? todaySession.isRest : true;
	const questsCard = <DailyQuestsCard quests={quests} isRestDay={isRestDay} />;

	if (!todaySession) {
		return (
			<>
				{gamificationBar}
				<Frame>
					<FramePanel>
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<Swords />
								</EmptyMedia>
								<EmptyTitle>{t("ready")}</EmptyTitle>
								<EmptyDescription>{t("comingSoon")}</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<GeneratePlanButton />
							</EmptyContent>
						</Empty>
					</FramePanel>
				</Frame>
				{questsCard}
			</>
		);
	}

	return (
		<>
			{gamificationBar}
			<TodaySessionCard
				session={todaySession}
				allExercises={allExercises}
				defaultMinutes={profile.sessionMinutes}
				isCompleted={Boolean(todayLog?.completedAt)}
				hasStarted={(todayLog?.sets.length ?? 0) > 0}
			/>
			{questsCard}
		</>
	);
}

export default async function TodayPage() {
	const t = await getTranslations("today");
	return (
		<main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
			<h1 className="font-semibold">{t("title")}</h1>
			<Suspense
				fallback={
					<Frame>
						<FramePanel className="h-48" />
					</Frame>
				}
			>
				<TodayContent />
			</Suspense>
		</main>
	);
}
