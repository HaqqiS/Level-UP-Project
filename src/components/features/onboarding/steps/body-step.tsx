"use client";
import { useTranslations } from "next-intl";
import type { KeyboardEvent } from "react";
import { DatePicker } from "@/components/reui/date-picker";
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
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { INJURIES, type OnboardingInput } from "@/lib/validation/onboarding";
import { CYCLE_REGULARITY_OPTIONS } from "@/lib/wellness/cycle-and-wellness";
import { type StepProps, toggleItem } from "./types";

const SEX_OPTIONS = ["male", "female", "prefer_not"] as const;
const MAX_BIRTH_YEAR = new Date().getFullYear() - 10;

function getLocaleDecimalSeparator(): string {
	return (
		Intl.NumberFormat()
			.formatToParts(0.1)
			.find((part) => part.type === "decimal")?.value ?? "."
	);
}

function handleWeightKeyDown(event: KeyboardEvent<HTMLInputElement>) {
	if (event.ctrlKey || event.metaKey || event.altKey) return;

	const decimal = getLocaleDecimalSeparator();
	if (
		(event.key === "," && decimal === ".") ||
		(event.key === "." && decimal === ",")
	) {
		event.preventDefault();
		return;
	}

	if (/^\d$/.test(event.key)) {
		const { value, selectionStart, selectionEnd } = event.currentTarget;
		const decIndex = value.indexOf(decimal);
		if (
			decIndex !== -1 &&
			selectionStart !== null &&
			selectionEnd !== null &&
			selectionStart === selectionEnd &&
			selectionStart > decIndex
		) {
			const fractionDigits = value
				.slice(decIndex + 1)
				.replace(/\D/g, "").length;
			if (fractionDigits >= 2) {
				event.preventDefault();
			}
		}
	}
}

function handleIntegerKeyDown(event: KeyboardEvent<HTMLInputElement>) {
	if (event.key === "." || event.key === ",") {
		event.preventDefault();
	}
}

export function BodyStep({ draft, update }: StepProps) {
	const t = useTranslations("onboarding.body");
	const tCommon = useTranslations("common");
	const selectedInjuries = draft.injuries ?? [];

	return (
		<FieldGroup>
			<div className="grid grid-cols-2 gap-3">
				<NumberField
					min={100}
					max={250}
					format={{ useGrouping: false, maximumFractionDigits: 0 }}
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
					smallStep={0.01}
					format={{ useGrouping: false, maximumFractionDigits: 2 }}
					value={draft.weightKg ?? null}
					onValueChange={(value) =>
						update({
							weightKg:
								value === null ? undefined : Math.round(value * 100) / 100,
						})
					}
				>
					<NumberFieldScrubArea label={t("weight")} />
					<NumberFieldGroup>
						<NumberFieldDecrement />
						<NumberFieldInput
							placeholder="65.00"
							onKeyDown={handleWeightKeyDown}
						/>
						<NumberFieldIncrement />
					</NumberFieldGroup>
				</NumberField>

				<NumberField
					min={1920}
					max={MAX_BIRTH_YEAR}
					step={1}
					format={{ useGrouping: false, maximumFractionDigits: 0 }}
					value={draft.birthYear ?? null}
					onValueChange={(value) =>
						update({
							birthYear: value === null ? undefined : Math.trunc(value),
						})
					}
				>
					<NumberFieldScrubArea label={t("birthYear")} />
					<NumberFieldGroup>
						<NumberFieldDecrement />
						<NumberFieldInput
							placeholder="2000"
							onKeyDown={handleIntegerKeyDown}
						/>
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
					onValueChange={(values) => {
						const nextSex = (values[0] as OnboardingInput["sex"]) ?? undefined;
						update({
							sex: nextSex,
							...(nextSex !== "female" ? { tracksPeriod: false } : {}),
						});
					}}
				>
					{SEX_OPTIONS.map((option) => (
						<ToggleGroupItem key={option} value={option}>
							{t(option)}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</FieldSet>

			{draft.sex === "female" && (
				<FieldSet>
					<FieldLegend variant="label">{t("periodSectionLabel")}</FieldLegend>
					<FieldLabel htmlFor="tracks-period">
						<Field orientation="horizontal">
							<Checkbox
								id="tracks-period"
								checked={draft.tracksPeriod === true}
								onCheckedChange={(checked) =>
									update({
										tracksPeriod: checked === true,
										averageCycleDays: draft.averageCycleDays ?? 28,
										averagePeriodDays: draft.averagePeriodDays ?? 5,
										cycleRegularity: draft.cycleRegularity ?? "UNKNOWN",
									})
								}
							/>
							<FieldContent>
								<FieldTitle>{t("periodTrackTitle")}</FieldTitle>
								<FieldDescription>{t("periodTrackDesc")}</FieldDescription>
							</FieldContent>
						</Field>
					</FieldLabel>

					{draft.tracksPeriod && (
						<div className="space-y-3">
							<Field>
								<FieldLabel htmlFor="last-period-date">
									{t("lastPeriodDate")}
								</FieldLabel>
								<DatePicker
									id="last-period-date"
									value={draft.lastPeriodStartDate ?? null}
									onChange={(val) =>
										update({
											lastPeriodStartDate: val ?? undefined,
										})
									}
									placeholder={tCommon("pickDate")}
									clearLabel={tCommon("clearDate")}
									clearable
									maxDate={new Date()}
								/>
							</Field>

							<div className="grid grid-cols-2 gap-3">
								<NumberField
									min={20}
									max={45}
									step={1}
									format={{ useGrouping: false, maximumFractionDigits: 0 }}
									value={draft.averageCycleDays ?? 28}
									onValueChange={(value) =>
										update({
											averageCycleDays: value === null ? 28 : Math.trunc(value),
										})
									}
								>
									<NumberFieldScrubArea label={t("averageCycleDays")} />
									<NumberFieldGroup>
										<NumberFieldDecrement />
										<NumberFieldInput
											placeholder="28"
											onKeyDown={handleIntegerKeyDown}
										/>
										<NumberFieldIncrement />
									</NumberFieldGroup>
								</NumberField>

								<NumberField
									min={2}
									max={10}
									step={1}
									format={{ useGrouping: false, maximumFractionDigits: 0 }}
									value={draft.averagePeriodDays ?? 5}
									onValueChange={(value) =>
										update({
											averagePeriodDays: value === null ? 5 : Math.trunc(value),
										})
									}
								>
									<NumberFieldScrubArea label={t("averagePeriodDays")} />
									<NumberFieldGroup>
										<NumberFieldDecrement />
										<NumberFieldInput
											placeholder="5"
											onKeyDown={handleIntegerKeyDown}
										/>
										<NumberFieldIncrement />
									</NumberFieldGroup>
								</NumberField>
							</div>

							<FieldSet>
								<FieldLegend variant="label">
									{t("cycleRegularityLabel")}
								</FieldLegend>
								<ToggleGroup
									variant="outline"
									className="w-full flex-wrap"
									value={[draft.cycleRegularity ?? "UNKNOWN"]}
									onValueChange={(values) => {
										const next =
											values[0] as OnboardingInput["cycleRegularity"];
										if (next) update({ cycleRegularity: next });
									}}
								>
									{CYCLE_REGULARITY_OPTIONS.map((opt) => (
										<ToggleGroupItem key={opt} value={opt}>
											{t(`cycleRegularityOptions.${opt}`)}
										</ToggleGroupItem>
									))}
								</ToggleGroup>
							</FieldSet>
						</div>
					)}
				</FieldSet>
			)}

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
									<FieldContent>
										<FieldTitle>{t(`injuryOptions.${injury}`)}</FieldTitle>
									</FieldContent>
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
