"use client";
import { Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	type ExperienceLevel,
	isBeginnerLevel,
	type MovementPattern,
} from "@/lib/exercises/eligibility";
import { discoverMoreExercisesAction } from "@/server/actions/exercises";

export function DiscoverExercisesButton({
	pattern,
	experienceLevel,
}: {
	pattern: MovementPattern;
	experienceLevel: ExperienceLevel;
}) {
	const t = useTranslations("exercises");
	const [pending, startTransition] = useTransition();
	const beginnerBlocked = isBeginnerLevel(experienceLevel);

	function handleClick() {
		startTransition(async () => {
			const result = await discoverMoreExercisesAction(pattern);
			if (result.ok) {
				toast.success(t("discoverSuccess", { count: result.addedCount }));
				return;
			}
			if (result.reason === "beginner_restricted") {
				toast.info(t("discoverBeginnerNote"));
			} else if (result.reason === "rate_limited") {
				toast.warning(t("discoverLimit"));
			} else if (result.reason === "empty") {
				toast.info(t("discoverEmpty"));
			} else {
				toast.error(t("discoverEmpty"));
			}
		});
	}

	return (
		<div className="flex flex-col gap-1.5">
			<Button
				variant="outline"
				className="w-full"
				disabled={pending || beginnerBlocked}
				onClick={handleClick}
			>
				{pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
				{pending
					? t("discovering")
					: t("discoverButton", { pattern: t(`patterns.${pattern}`) })}
			</Button>
			{beginnerBlocked && (
				<p className="text-center text-xs text-muted-foreground">
					{t("discoverBeginnerNote")}
				</p>
			)}
		</div>
	);
}
