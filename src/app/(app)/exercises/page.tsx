import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ExerciseBrowser } from "@/components/features/exercises/exercise-browser";
import { Frame, FramePanel } from "@/components/reui/frame";
import { requireOnboarded } from "@/lib/auth/session";
import { db } from "@/lib/db";

async function ExercisesContent() {
	const { profile } = await requireOnboarded();
	const exercises = await db.exercise.findMany({
		orderBy: [{ pattern: "asc" }, { difficulty: "asc" }, { name: "asc" }],
		select: {
			id: true,
			slug: true,
			name: true,
			pattern: true,
			difficulty: true,
			equipment: true,
			measure: true,
			cues: true,
			contraindications: true,
			progressionNextId: true,
			status: true,
			source: true,
			sourceUrl: true,
			license: true,
		},
	});

	return (
		<ExerciseBrowser
			exercises={exercises}
			profile={{
				experienceLevel: profile.experienceLevel,
				equipment: profile.equipment,
				injuries: profile.injuries,
			}}
		/>
	);
}

export default async function ExercisesPage() {
	const t = await getTranslations("exercises");
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
				<ExercisesContent />
			</Suspense>
		</main>
	);
}
