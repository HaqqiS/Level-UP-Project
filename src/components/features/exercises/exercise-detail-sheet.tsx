"use client";
import { ExternalLink, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert";
import { Badge } from "@/components/reui/badge";
import {
	Timeline,
	TimelineContent,
	TimelineHeader,
	TimelineIndicator,
	TimelineItem,
	TimelineSeparator,
	TimelineTitle,
} from "@/components/reui/timeline";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { buildProgressionChain } from "@/lib/exercises/eligibility";
import type { ExerciseItem } from "./types";

export function ExerciseDetailSheet({
	exercise,
	allExercises,
	onOpenChange,
	onSelectExercise,
}: {
	exercise: ExerciseItem | null;
	allExercises: readonly ExerciseItem[];
	onOpenChange: (open: boolean) => void;
	onSelectExercise: (exercise: ExerciseItem) => void;
}) {
	const t = useTranslations();

	if (!exercise) return null;

	const chain = buildProgressionChain(exercise.id, allExercises);
	const activeIndex = chain.findIndex((item) => item.id === exercise.id);

	return (
		<Sheet open={Boolean(exercise)} onOpenChange={onOpenChange}>
			<SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
				<SheetHeader>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="secondary">
							{t(`exercises.patterns.${exercise.pattern}`)}
						</Badge>
						<Badge variant="outline">
							{t("exercises.levelBadge", { level: exercise.difficulty })}
						</Badge>
						{exercise.status === "UNVERIFIED" && (
							<Badge variant="warning-light">
								{t("exercises.unverifiedBadge")}
							</Badge>
						)}
					</div>
					<SheetTitle>{exercise.name}</SheetTitle>
					<SheetDescription>
						{exercise.equipment
							.map((eq) =>
								t(`onboarding.equipment.${eq}` as "onboarding.equipment.none"),
							)
							.join(" · ")}
					</SheetDescription>
				</SheetHeader>

				<div className="flex flex-col gap-5 px-6 pb-6">
					{exercise.status === "UNVERIFIED" && (
						<Alert variant="warning">
							<TriangleAlert />
							<AlertTitle>{t("exercises.unverifiedWarningTitle")}</AlertTitle>
							<AlertDescription>
								{t("exercises.unverifiedWarningBody")}
							</AlertDescription>
						</Alert>
					)}

					<section className="space-y-2">
						<h3 className="text-sm font-semibold">
							{t("exercises.cuesTitle")}
						</h3>
						<ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
							{exercise.cues.map((cue) => (
								<li key={cue}>{cue}</li>
							))}
						</ul>
					</section>

					{exercise.contraindications.length > 0 && (
						<section className="space-y-2">
							<h3 className="text-sm font-semibold">
								{t("exercises.avoidIfInjuredTitle")}
							</h3>
							<div className="flex flex-wrap gap-1.5">
								{exercise.contraindications.map((injury) => (
									<Badge key={injury} variant="destructive-light" size="sm">
										{t(
											`onboarding.body.injuryOptions.${injury}` as "onboarding.body.injuryOptions.shoulder",
										)}
									</Badge>
								))}
							</div>
						</section>
					)}

					{chain.length > 1 && (
						<section className="space-y-3">
							<h3 className="text-sm font-semibold">
								{t("exercises.progressionTitle")}
							</h3>
							<Timeline value={activeIndex + 1}>
								{chain.map((stepEx, idx) => {
									const isCurrent = stepEx.id === exercise.id;
									return (
										<TimelineItem key={stepEx.id} step={idx + 1}>
											<TimelineHeader>
												<TimelineIndicator />
												<TimelineSeparator />
												<TimelineTitle className="flex items-center gap-2">
													<button
														type="button"
														onClick={() => onSelectExercise(stepEx)}
														className="text-left hover:underline"
													>
														{stepEx.name}
													</button>
													{isCurrent && (
														<Badge variant="primary-light" size="xs">
															{t("exercises.currentStepBadge")}
														</Badge>
													)}
												</TimelineTitle>
											</TimelineHeader>
											<TimelineContent>
												{t("exercises.levelBadge", {
													level: stepEx.difficulty,
												})}
											</TimelineContent>
										</TimelineItem>
									);
								})}
							</Timeline>
						</section>
					)}

					{exercise.license && (
						<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<span>
								{t("exercises.sourceAttribution", {
									license: exercise.license,
								})}
							</span>
							{exercise.sourceUrl && (
								<a
									href={exercise.sourceUrl}
									target="_blank"
									rel="noreferrer"
									aria-label={exercise.name}
									className="inline-flex items-center hover:text-foreground"
								>
									<ExternalLink className="size-3" />
								</a>
							)}
						</p>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
