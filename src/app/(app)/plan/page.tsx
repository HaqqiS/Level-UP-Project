import { Calendar } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { GeneratePlanButton } from "@/components/features/plan/generate-plan-button";
import { WeeklyPlanView } from "@/components/features/plan/weekly-plan-view";
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
import { getCurrentPlanPageData } from "@/server/services/weekly-plan-service";

async function PlanContent() {
	const t = await getTranslations("plan");
	const { session, profile } = await requireOnboarded();
	const { plan, todayDayOfWeek, allExercises } = await getCurrentPlanPageData(
		session.user.id,
		profile.timezone,
	);

	if (!plan) {
		return (
			<Frame>
				<FramePanel>
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<Calendar />
							</EmptyMedia>
							<EmptyTitle>{t("emptyTitle")}</EmptyTitle>
							<EmptyDescription>{t("emptyDescription")}</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<GeneratePlanButton />
						</EmptyContent>
					</Empty>
				</FramePanel>
			</Frame>
		);
	}

	return (
		<WeeklyPlanView
			plan={plan}
			todayDayOfWeek={todayDayOfWeek}
			allExercises={allExercises}
		/>
	);
}

export default async function PlanPage() {
	const t = await getTranslations("plan");
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
				<PlanContent />
			</Suspense>
		</main>
	);
}
