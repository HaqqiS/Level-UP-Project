"use client";
import { useTranslations } from "next-intl";
import {
	NumberField,
	NumberFieldDecrement,
	NumberFieldGroup,
	NumberFieldIncrement,
	NumberFieldInput,
	NumberFieldScrubArea,
} from "@/components/reui/number-field";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	EXPERIENCE_LEVELS,
	type OnboardingInput,
} from "@/lib/validation/onboarding";
import type { StepProps } from "./types";

const SELF_CHECK_FIELDS = [
	{ key: "maxPushups", max: 200, step: 1, largeStep: 10, snapOnStep: false },
	{ key: "maxPullups", max: 100, step: 1, largeStep: 10, snapOnStep: false },
	{ key: "plankSeconds", max: 1800, step: 5, largeStep: 15, snapOnStep: true },
] as const;

export function ExperienceStep({ draft, update }: StepProps) {
	const t = useTranslations("onboarding.experience");

	return (
		<FieldGroup>
			<RadioGroup
				value={draft.experienceLevel ?? ""}
				onValueChange={(value) =>
					update({
						experienceLevel: value as OnboardingInput["experienceLevel"],
					})
				}
			>
				{EXPERIENCE_LEVELS.map((level) => {
					const id = `exp-${level}`;
					return (
						<FieldLabel key={level} htmlFor={id}>
							<Field orientation="horizontal">
								<FieldContent>
									<FieldTitle>{t(level)}</FieldTitle>
									<FieldDescription>{t(`${level}_desc`)}</FieldDescription>
								</FieldContent>
								<RadioGroupItem value={level} id={id} />
							</Field>
						</FieldLabel>
					);
				})}
			</RadioGroup>

			<FieldSet>
				<FieldLegend variant="label">{t("selfCheck")}</FieldLegend>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					{SELF_CHECK_FIELDS.map(
						({ key, max, step, largeStep, snapOnStep }) => (
							<NumberField
								key={key}
								min={0}
								max={max}
								step={step}
								smallStep={step}
								largeStep={largeStep}
								snapOnStep={snapOnStep}
								format={{ useGrouping: false, maximumFractionDigits: 0 }}
								value={draft[key] ?? null}
								onValueChange={(value) =>
									update({
										[key]: value === null ? undefined : Math.trunc(value),
									})
								}
							>
								<NumberFieldScrubArea label={t(key)} />
								<NumberFieldGroup>
									<NumberFieldDecrement />
									<NumberFieldInput placeholder="—" />
									<NumberFieldIncrement />
								</NumberFieldGroup>
							</NumberField>
						),
					)}
				</div>
			</FieldSet>
		</FieldGroup>
	);
}
