"use client";
import { useTranslations } from "next-intl";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	type OnboardingInput,
	SESSION_MINUTES,
} from "@/lib/validation/onboarding";
import type { StepProps } from "./types";

const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0] as const;

export function ScheduleStep({ draft, update }: StepProps) {
	const t = useTranslations("onboarding.schedule");

	return (
		<FieldGroup>
			<FieldSet>
				<FieldLegend variant="label">{t("days")}</FieldLegend>
				<ToggleGroup
					multiple
					variant="outline"
					spacing={1}
					className="grid w-full grid-cols-7 gap-1"
					value={(draft.trainingDays ?? []).map(String)}
					onValueChange={(values) =>
						update({ trainingDays: values.map(Number) })
					}
				>
					{ORDERED_DAYS.map((day) => (
						<ToggleGroupItem
							key={day}
							value={String(day)}
							className="w-full px-0 text-xs sm:px-2"
						>
							{t(`dayNames.${day}` as "dayNames.0")}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</FieldSet>

			<FieldSet>
				<FieldLegend variant="label">{t("length")}</FieldLegend>
				<ToggleGroup
					variant="outline"
					className="w-full flex-wrap"
					value={draft.sessionMinutes ? [String(draft.sessionMinutes)] : []}
					onValueChange={(values) => {
						const selected = values[0];
						if (selected) {
							update({
								sessionMinutes: Number(
									selected,
								) as OnboardingInput["sessionMinutes"],
							});
						}
					}}
				>
					{SESSION_MINUTES.map((minutes) => (
						<ToggleGroupItem key={minutes} value={String(minutes)}>
							{t("minutes", { n: minutes })}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</FieldSet>
		</FieldGroup>
	);
}
