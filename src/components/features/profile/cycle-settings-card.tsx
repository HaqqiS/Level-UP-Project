"use client";
import { CalendarHeart, Loader2, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/reui/alert";
import { Badge } from "@/components/reui/badge";
import { DatePicker } from "@/components/reui/date-picker";
import {
	Frame,
	FrameDescription,
	FrameFooter,
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
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	CYCLE_REGULARITY_OPTIONS,
	type CycleRegularityValue,
} from "@/lib/wellness/cycle-and-wellness";
import { updateCycleSettingsAction } from "@/server/actions/wellness";

export function CycleSettingsCard({
	initialTracksPeriod,
	initialLastPeriodStartDate,
	initialAverageCycleDays,
	initialAveragePeriodDays,
	initialCycleRegularity,
	initialLutealPhaseDays,
	initialPeriodReminderEnabled,
	hasPushSubscription,
	embedded = false,
	onSaved,
}: {
	initialTracksPeriod: boolean;
	initialLastPeriodStartDate: string | null;
	initialAverageCycleDays: number;
	initialAveragePeriodDays: number;
	initialCycleRegularity: CycleRegularityValue;
	initialLutealPhaseDays: number;
	initialPeriodReminderEnabled: boolean;
	hasPushSubscription: boolean;
	embedded?: boolean;
	onSaved?: (next: { tracksPeriod: boolean }) => void;
}) {
	const t = useTranslations();
	const [tracksPeriod, setTracksPeriod] = useState(initialTracksPeriod);
	const [lastPeriodStartDate, setLastPeriodStartDate] = useState(
		initialLastPeriodStartDate ?? "",
	);
	const [averageCycleDays, setAverageCycleDays] = useState(
		initialAverageCycleDays,
	);
	const [averagePeriodDays, setAveragePeriodDays] = useState(
		initialAveragePeriodDays,
	);
	const [cycleRegularity, setCycleRegularity] = useState<CycleRegularityValue>(
		initialCycleRegularity,
	);
	const [lutealPhaseDays, setLutealPhaseDays] = useState(
		initialLutealPhaseDays,
	);
	const [periodReminderEnabled, setPeriodReminderEnabled] = useState(
		initialPeriodReminderEnabled,
	);
	const [pending, startTransition] = useTransition();

	function handleSave() {
		startTransition(async () => {
			const res = await updateCycleSettingsAction({
				tracksPeriod,
				lastPeriodStartDate: tracksPeriod
					? lastPeriodStartDate.trim() || null
					: null,
				averageCycleDays,
				averagePeriodDays,
				cycleRegularity: tracksPeriod ? cycleRegularity : "UNKNOWN",
				lutealPhaseDays,
				periodReminderEnabled: tracksPeriod && periodReminderEnabled,
			});

			if (res.ok) {
				onSaved?.({ tracksPeriod });
				toast.success(t("profile.cycleSettings.savedToast"));
			} else {
				toast.error(t("common.error"));
			}
		});
	}

	const fieldsContent = (
		<FieldGroup className="gap-4">
			<FieldLabel htmlFor="profile-tracks-period">
				<Field orientation="horizontal">
					<Checkbox
						id="profile-tracks-period"
						checked={tracksPeriod}
						onCheckedChange={(checked) => setTracksPeriod(checked === true)}
					/>
					<FieldContent>
						<FieldTitle>{t("onboarding.body.periodTrackTitle")}</FieldTitle>
						<FieldDescription>
							{t("onboarding.body.periodTrackDesc")}
						</FieldDescription>
					</FieldContent>
				</Field>
			</FieldLabel>

			{tracksPeriod && (
				<>
					<Field>
						<FieldLabel htmlFor="profile-last-period-date">
							{t("onboarding.body.lastPeriodDate")}
						</FieldLabel>
						<DatePicker
							id="profile-last-period-date"
							value={lastPeriodStartDate || null}
							onChange={(val) => setLastPeriodStartDate(val ?? "")}
							placeholder={t("common.pickDate")}
							clearLabel={t("common.clearDate")}
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
							value={averageCycleDays}
							onValueChange={(value) =>
								setAverageCycleDays(value === null ? 28 : Math.trunc(value))
							}
						>
							<NumberFieldScrubArea
								label={t("onboarding.body.averageCycleDays")}
							/>
							<NumberFieldGroup>
								<NumberFieldDecrement />
								<NumberFieldInput />
								<NumberFieldIncrement />
							</NumberFieldGroup>
						</NumberField>

						<NumberField
							min={2}
							max={10}
							step={1}
							format={{ useGrouping: false, maximumFractionDigits: 0 }}
							value={averagePeriodDays}
							onValueChange={(value) =>
								setAveragePeriodDays(value === null ? 5 : Math.trunc(value))
							}
						>
							<NumberFieldScrubArea
								label={t("onboarding.body.averagePeriodDays")}
							/>
							<NumberFieldGroup>
								<NumberFieldDecrement />
								<NumberFieldInput />
								<NumberFieldIncrement />
							</NumberFieldGroup>
						</NumberField>
					</div>

					<FieldSet>
						<FieldLegend variant="label">
							{t("onboarding.body.cycleRegularityLabel")}
						</FieldLegend>
						<ToggleGroup
							variant="outline"
							className="w-full flex-wrap"
							value={[cycleRegularity]}
							onValueChange={(values) => {
								const next = values[0] as CycleRegularityValue | undefined;
								if (next) setCycleRegularity(next);
							}}
						>
							{CYCLE_REGULARITY_OPTIONS.map((opt) => (
								<ToggleGroupItem key={opt} value={opt}>
									{t(`onboarding.body.cycleRegularityOptions.${opt}`)}
								</ToggleGroupItem>
							))}
						</ToggleGroup>
					</FieldSet>

					<FieldLabel htmlFor="profile-period-reminder">
						<Field orientation="horizontal">
							<Checkbox
								id="profile-period-reminder"
								checked={periodReminderEnabled}
								onCheckedChange={(checked) =>
									setPeriodReminderEnabled(checked === true)
								}
							/>
							<FieldContent>
								<FieldTitle>
									{t("profile.cycleSettings.reminderTitle")}
								</FieldTitle>
								<FieldDescription>
									{t("profile.cycleSettings.reminderDesc")}
								</FieldDescription>
							</FieldContent>
						</Field>
					</FieldLabel>

					{periodReminderEnabled && !hasPushSubscription && (
						<Alert variant="info">
							<AlertDescription>
								{t("profile.cycleSettings.pushRequiredHint")}
							</AlertDescription>
						</Alert>
					)}

					<Accordion>
						<AccordionItem value="advanced">
							<AccordionTrigger>
								{t("profile.cycleSettings.advancedTitle")}
							</AccordionTrigger>
							<AccordionContent className="space-y-3">
								<NumberField
									min={10}
									max={17}
									step={1}
									format={{
										useGrouping: false,
										maximumFractionDigits: 0,
									}}
									value={lutealPhaseDays}
									onValueChange={(value) =>
										setLutealPhaseDays(value === null ? 14 : Math.trunc(value))
									}
								>
									<NumberFieldScrubArea
										label={t("profile.cycleSettings.lutealDaysLabel")}
									/>
									<NumberFieldGroup>
										<NumberFieldDecrement />
										<NumberFieldInput />
										<NumberFieldIncrement />
									</NumberFieldGroup>
								</NumberField>
								<FrameDescription>
									{t("profile.cycleSettings.lutealDaysHint")}
								</FrameDescription>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</>
			)}
		</FieldGroup>
	);

	const saveButton = (
		<Button className="w-full" disabled={pending} onClick={handleSave}>
			{pending ? <Loader2 className="animate-spin" /> : <Save />}
			{pending
				? t("profile.cycleSettings.saving")
				: t("profile.cycleSettings.saveButton")}
		</Button>
	);

	if (embedded) {
		return (
			<div className="space-y-4 px-6 pb-6">
				{fieldsContent}
				{saveButton}
			</div>
		);
	}

	return (
		<Frame>
			<FrameHeader>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<FrameTitle className="flex items-center gap-2">
						<CalendarHeart className="size-4 text-primary" />
						{t("profile.cycleSettings.title")}
					</FrameTitle>
					<Badge
						variant={tracksPeriod ? "success-light" : "secondary"}
						size="sm"
					>
						{tracksPeriod
							? t("profile.cycleSettings.enabledBadge")
							: t("profile.cycleSettings.disabledBadge")}
					</Badge>
				</div>
				<FrameDescription>
					{t("profile.cycleSettings.description")}
				</FrameDescription>
			</FrameHeader>

			<FramePanel className="space-y-4">{fieldsContent}</FramePanel>

			<FrameFooter>{saveButton}</FrameFooter>
		</Frame>
	);
}
