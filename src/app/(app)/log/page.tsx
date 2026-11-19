import { ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { GamificationBar } from "@/components/features/gamification/gamification-bar";
import { WorkoutLogger } from "@/components/features/logger/workout-logger";
import { Frame, FramePanel } from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
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

async function LogContent() {
	const t = await getTranslations("logger");
	const { session } = await requireOnboarded();
	const { todaySession, todayLog, stats } = await ensureTodayQuestsAndStats(
		session.user.id,
	);

	return (
		<>
			<GamificationBar stats={stats} />
			{!todaySession || todaySession.isRest ? (
				<Frame>
					<FramePanel>
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<ClipboardCheck />
								</EmptyMedia>
								<EmptyTitle>{t("noSessionTitle")}</EmptyTitle>
								<EmptyDescription>{t("noSessionDescription")}</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<Button
									variant="outline"
									nativeButton={false}
									render={<Link href="/today" />}
								>
									{t("goToToday")}
								</Button>
							</EmptyContent>
						</Empty>
					</FramePanel>
				</Frame>
			) : (
				<WorkoutLogger
					session={todaySession}
					workoutLog={
						todayLog
							? {
									id: todayLog.id,
									date: todayLog.date,
									completedAt: todayLog.completedAt
										? todayLog.completedAt.toISOString()
										: null,
									sets: todayLog.sets.map((s) => ({
										id: s.id,
										exerciseId: s.exerciseId,
										setNumber: s.setNumber,
										reps: s.reps,
										seconds: s.seconds,
									})),
								}
							: null
					}
				/>
			)}
		</>
	);
}

export default async function LogPage() {
	const t = await getTranslations("logger");
	return (
		<main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
			<div>
				<h1 className="font-semibold">{t("title")}</h1>
				<p className="text-sm text-muted-foreground">{t("subtitle")}</p>
			</div>
			<Suspense
				fallback={
					<Frame>
						<FramePanel className="h-48" />
					</Frame>
				}
			>
				<LogContent />
			</Suspense>
		</main>
	);
}
