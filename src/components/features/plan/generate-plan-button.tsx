"use client";
import { Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateCurrentWeekPlanAction } from "@/server/actions/plan";

export function GeneratePlanButton() {
	const t = useTranslations("today");
	const [pending, startTransition] = useTransition();

	function handleGenerate() {
		startTransition(async () => {
			const result = await generateCurrentWeekPlanAction();
			if (!result.ok) {
				toast.error(t("generateError"));
				return;
			}
			if (result.fallbackUsed) {
				toast.info(t("generateFallback"));
			} else {
				toast.success(t("generateSuccess"));
			}
		});
	}

	return (
		<Button className="w-full" disabled={pending} onClick={handleGenerate}>
			{pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
			{pending ? t("generating") : t("generate")}
		</Button>
	);
}
