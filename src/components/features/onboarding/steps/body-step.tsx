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
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { INJURIES, type OnboardingInput } from "@/lib/validation/onboarding";
import { type StepProps, toggleItem } from "./types";

const SEX_OPTIONS = ["male", "female", "prefer_not"] as const;
const MAX_BIRTH_YEAR = new Date().getFullYear() - 10;

export function BodyStep({ draft, update }: StepProps) {
	const t = useTranslations("onboarding.body");
	const selectedInjuries = draft.injuries ?? [];

	return (
		<FieldGroup>
			<div className="grid grid-cols-2 gap-3">
				<NumberField
					min={100}
					max={250}
					value={draft.heightCm ?? null}
					onValueChange={(value) => update({ heightCm: value ?? undefined })}
				>
					<NumberFieldScrubArea label={t("height")} />
					<NumberFieldGroup>
						<NumberFieldDecrement />
						<NumberFieldInput placeholder="170" />
						<NumberFieldIncrement />
					</NumberFieldGroup>
				</NumberField>

				<NumberField
					min={25}
					max={300}
					step={0.1}
					value={draft.weightKg ?? null}
					onValueChange={(value) => update({ weightKg: value ?? undefined })}
				>
					<NumberFieldScrubArea label={t("weight")} />
					<NumberFieldGroup>
						<NumberFieldDecrement />
						<NumberFieldInput placeholder="65" />
						<NumberFieldIncrement />
					</NumberFieldGroup>
				</NumberField>

				<NumberField
					min={1920}
					max={MAX_BIRTH_YEAR}
					value={draft.birthYear ?? null}
					onValueChange={(value) => update({ birthYear: value ?? undefined })}
				>
					<NumberFieldScrubArea label={t("birthYear")} />
					<NumberFieldGroup>
						<NumberFieldDecrement />
						<NumberFieldInput placeholder="—" />
						<NumberFieldIncrement />
					</NumberFieldGroup>
				</NumberField>
			</div>

			<FieldSet>
				<FieldLegend variant="label">{t("sex")}</FieldLegend>
				<ToggleGroup
					variant="outline"
					className="w-full flex-wrap"
					value={draft.sex ? [draft.sex] : []}
					onValueChange={(values) =>
						update({
							sex: (values[0] as OnboardingInput["sex"]) ?? undefined,
						})
					}
				>
					{SEX_OPTIONS.map((option) => (
						<ToggleGroupItem key={option} value={option}>
							{t(option)}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</FieldSet>

			<FieldSet>
				<FieldLegend variant="label">{t("injuries")}</FieldLegend>
				<FieldGroup className="grid grid-cols-2 gap-3">
					{INJURIES.map((injury) => {
						const id = `injury-${injury}`;
						return (
							<FieldLabel key={injury} htmlFor={id}>
								<Field orientation="horizontal">
									<Checkbox
										id={id}
										checked={selectedInjuries.includes(injury)}
										onCheckedChange={() =>
											update({
												injuries: toggleItem(draft.injuries, injury),
											})
										}
									/>
									<FieldTitle>{t(`injuryOptions.${injury}`)}</FieldTitle>
								</Field>
							</FieldLabel>
						);
					})}
				</FieldGroup>
			</FieldSet>

			<Field>
				<FieldLabel htmlFor="injuryNotes">{t("injuryNotes")}</FieldLabel>
				<Textarea
					id="injuryNotes"
					maxLength={500}
					value={draft.injuryNotes ?? ""}
					onChange={(e) => update({ injuryNotes: e.target.value || undefined })}
				/>
			</Field>
		</FieldGroup>
	);
}
