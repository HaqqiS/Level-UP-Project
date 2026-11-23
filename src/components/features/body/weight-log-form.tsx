"use client";
import { Loader2, Scale } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
	NumberField,
	NumberFieldDecrement,
	NumberFieldGroup,
	NumberFieldIncrement,
	NumberFieldInput,
	NumberFieldScrubArea,
} from "@/components/reui/number-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeightEntryPoint } from "@/lib/body/metrics";
import { logWeightAction } from "@/server/actions/body";
import { WeightHistoryList } from "./weight-history-list";

export function WeightLogForm({
	latestWeightKg,
	entries,
}: {
	latestWeightKg: number | null;
	entries: readonly WeightEntryPoint[];
}) {
	const t = useTranslations();
	const [weightKg, setWeightKg] = useState<number>(latestWeightKg ?? 65);
	const [pending, startTransition] = useTransition();

	function handleSave() {
		startTransition(async () => {
			const result = await logWeightAction({ weightKg });
			if (result.ok) {
				toast.success(t("body.logSuccess"));
			} else {
				toast.error(t("common.error"));
			}
		});
	}

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle>{t("body.logTitle")}</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				<div className="flex items-end gap-3">
					<NumberField
						className="flex-1"
						min={25}
						max={300}
						step={0.1}
						value={weightKg}
						onValueChange={(value) => {
							if (typeof value === "number") setWeightKg(value);
						}}
					>
						<NumberFieldScrubArea label={t("body.weightInputLabel")} />
						<NumberFieldGroup>
							<NumberFieldDecrement />
							<NumberFieldInput />
							<NumberFieldIncrement />
						</NumberFieldGroup>
					</NumberField>

					<Button disabled={pending} onClick={handleSave}>
						{pending ? <Loader2 className="animate-spin" /> : <Scale />}
						{pending ? t("body.logging") : t("body.logButton")}
					</Button>
				</div>

				<WeightHistoryList entries={entries} />
			</CardContent>
		</Card>
	);
}
