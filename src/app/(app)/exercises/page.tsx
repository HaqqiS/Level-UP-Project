import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ExerciseBrowser } from "@/components/features/exercises/exercise-browser";
import { resolveBodyMapGender } from "@/components/features/muscles/body-map-paths";
import { Frame, FramePanel } from "@/components/reui/frame";
import { requireOnboarded } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { evaluateSkillTree } from "@/lib/gamification/skill-tree";

async function ExercisesContent() {
	const { session, profile } = await requireOnboarded();
	const [exercises, rawSetLogs, edges] = await Promise.all([
		db.exercise.findMany({
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
				primaryMuscles: true,
				secondaryMuscles: true,
				muscles: {
					select: {
						muscleGroup: true,
						role: true,
						activationWeight: true,
					},
					orderBy: { activationWeight: "desc" },
				},
				masteryTargetSets: true,
				masteryTargetReps: true,
				masteryTargetSeconds: true,
				branchKey: true,
				treeTier: true,
				masteryBenchmarks: {
					select: {
						tier: true,
						targetSets: true,
						targetReps: true,
						targetSeconds: true,
						minConsecutiveSessions: true,
						maxRpe: true,
						tempo: true,
						formStandard: true,
						unlocksNext: true,
					},
				},
				progressionNextId: true,
				status: true,
				source: true,
				sourceUrl: true,
				license: true,
			},
		}),
		db.setLog.findMany({
			where: { workoutLog: { userId: session.user.id } },
			orderBy: [{ workoutLog: { date: "asc" } }, { completedAt: "asc" }],
			select: {
				workoutLogId: true,
				exerciseId: true,
				reps: true,
				seconds: true,
				rpe: true,
				workoutLog: {
					select: {
						date: true,
					},
				},
			},
		}),
		db.exerciseEdge.findMany({
			select: {
				id: true,
				fromExerciseId: true,
				toExerciseId: true,
				kind: true,
				branchLabel: true,
				requiredTier: true,
				order: true,
			},
			orderBy: [{ order: "asc" }, { id: "asc" }],
		}),
	]);

	const setLogs = rawSetLogs.map((log) => ({
		workoutLogId: log.workoutLogId,
		exerciseId: log.exerciseId,
		reps: log.reps,
		seconds: log.seconds,
		rpe: log.rpe,
		date: log.workoutLog.date,
	}));

	const skillTree = evaluateSkillTree({
		exercises,
		setLogs,
		experienceLevel: profile.experienceLevel,
		edges,
	});

	return (
		<ExerciseBrowser
			exercises={exercises}
			profile={{
				experienceLevel: profile.experienceLevel,
				equipment: profile.equipment,
				injuries: profile.injuries,
			}}
			skillTree={skillTree}
			bodyMapGender={resolveBodyMapGender(profile.sex)}
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
