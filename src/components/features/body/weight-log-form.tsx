"use client";
import { Loader2, Scale } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
	Frame,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@/components/reui/frame";
import {
	NumberField,
	NumberFieldDecrement,
	NumberFieldGroup,
	NumberFieldIncrement,
	NumberFieldInput,
	NumberFieldScrubArea,
} from "@/components/reui/number-field";
import { Button } from "@/components/ui/button";
import { logWeightAction } from "@/server/actions/body";

export function WeightLogForm({
	latestWeightKg,
}: {
	latestWeightKg: number | null;
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
		<Frame spacing="sm">
			<FrameHeader>
				<FrameTitle>{t("body.logTitle")}</FrameTitle>
			</FrameHeader>
			<FramePanel>
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
			</FramePanel>
		</Frame>
	);
}
