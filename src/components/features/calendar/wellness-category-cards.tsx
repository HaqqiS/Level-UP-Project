"use client";
import {
	Activity,
	BatteryCharging,
	Bone,
	Brain,
	Droplet,
	Droplets,
	Flame,
	GlassWater,
	HeartPulse,
	Info,
	Moon,
	Pill,
	Plus,
	Smile,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Badge } from "@/components/reui/badge";
import {
	Frame,
	FrameDescription,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	computeSleepDurationMinutes,
	formatSleepDuration,
	getVisiblePainTags,
	HYDRATION_PRESETS_ML,
	MEDICATION_OPTIONS,
	MOOD_TAG_OPTIONS,
	type MoodTagOption,
	type PainTagOption,
	PERIOD_FLOW_OPTIONS,
	SUPPLEMENT_OPTIONS,
	togglePainTag,
	type WellnessItemKindValue,
} from "@/lib/wellness/cycle-and-wellness";
import type {
	CalendarDayLogView,
	CustomWellnessItemView,
} from "@/server/services/wellness-service";
import type { LearnMoreTopic, WellnessCategoryKey } from "./wellness-sheets";

const SEVERITY_STEPS = [1, 2, 3, 4, 5] as const;

function getPainTagIcon(tag: PainTagOption) {
	switch (tag) {
		case "pain_free":
			return Smile;
		case "cramps":
			return Zap;
		case "ovulation":
			return Sparkles;
		case "breast_tenderness":
			return HeartPulse;
		case "headache":
		case "migraine":
		case "migraine_with_aura":
			return Brain;
		case "lower_back":
		case "leg":
			return Activity;
		case "joint":
			return Bone;
	}
}

function getPeriodFlowIcon(flow: (typeof PERIOD_FLOW_OPTIONS)[number]) {
	return flow === "light" || flow === "medium" ? Droplet : Droplets;
}

function SeverityScaleRow({
	label,
	value,
	onChange,
}: {
	label: string;
	value: number | null;
	onChange: (next: number | null) => void;
}) {
	return (
		<div className="space-y-1.5 pt-2">
			<div className="flex items-center justify-between text-xs text-muted-foreground">
				<span>{label}</span>
				{value !== null && (
					<span className="font-medium text-foreground">{value}/5</span>
				)}
			</div>
			<div className="grid grid-cols-5 gap-1.5">
				{SEVERITY_STEPS.map((step) => (
					<Button
						key={step}
						type="button"
						size="xs"
						variant={value === step ? "default" : "outline"}
						onClick={() => onChange(value === step ? null : step)}
					>
						{step}
					</Button>
				))}
			</div>
		</div>
	);
}

export function WellnessCategoryCards({
	activeDraft,
	patchDraft,
	tracksPeriod,
	visibleCategories,
	searchQuery,
	customItems,
	addingItemKind,
	onAddCustomItem,
	onArchiveCustomItem,
	onOpenLearnMore,
}: {
	activeDraft: CalendarDayLogView;
	patchDraft: (patch: Partial<CalendarDayLogView>) => void;
	tracksPeriod: boolean;
	visibleCategories: readonly WellnessCategoryKey[];
	searchQuery: string;
	customItems: CustomWellnessItemView[];
	addingItemKind: WellnessItemKindValue | null;
	onAddCustomItem: (
		kind: WellnessItemKindValue,
		name: string,
	) => Promise<boolean>;
	onArchiveCustomItem: (itemId: string) => void;
	onOpenLearnMore: (topic: LearnMoreTopic) => void;
}) {
	const t = useTranslations("calendar");
	const [newSupplementName, setNewSupplementName] = useState("");
	const [newMedicationName, setNewMedicationName] = useState("");

	const q = searchQuery.trim().toLowerCase();
	const visibleSet = new Set(visibleCategories);
	const visiblePainOptions = useMemo(
		() => getVisiblePainTags(tracksPeriod),
		[tracksPeriod],
	);

	const customSupplements = useMemo(
		() => customItems.filter((i) => i.kind === "SUPPLEMENT"),
		[customItems],
	);
	const customMedications = useMemo(
		() => customItems.filter((i) => i.kind === "MEDICATION"),
		[customItems],
	);

	const filteredPeriod = useMemo(
		() =>
			PERIOD_FLOW_OPTIONS.filter(
				(opt) =>
					!q ||
					t(`periodOptions.${opt}`).toLowerCase().includes(q) ||
					t("periodTitle").toLowerCase().includes(q) ||
					"period flow".includes(q),
			),
		[q, t],
	);

	const filteredPain = useMemo(
		() =>
			visiblePainOptions.filter(
				(opt) =>
					!q ||
					t(`painOptions.${opt}`).toLowerCase().includes(q) ||
					t("painTitle").toLowerCase().includes(q) ||
					"pain symptom".includes(q),
			),
		[visiblePainOptions, q, t],
	);

	const filteredPresetSupps = useMemo(
		() =>
			SUPPLEMENT_OPTIONS.filter(
				(opt) =>
					!q ||
					t(`supplementOptions.${opt}`).toLowerCase().includes(q) ||
					t("supplementsTitle").toLowerCase().includes(q) ||
					"supplements".includes(q),
			),
		[q, t],
	);
	const filteredCustomSupps = useMemo(
		() =>
			customSupplements.filter(
				(item) =>
					!q ||
					item.name.toLowerCase().includes(q) ||
					t("supplementsTitle").toLowerCase().includes(q) ||
					"supplements".includes(q),
			),
		[customSupplements, q, t],
	);

	const filteredPresetMeds = useMemo(
		() =>
			MEDICATION_OPTIONS.filter(
				(opt) =>
					!q ||
					t(`medicationOptions.${opt}`).toLowerCase().includes(q) ||
					t("medicationsTitle").toLowerCase().includes(q) ||
					"medications".includes(q),
			),
		[q, t],
	);
	const filteredCustomMeds = useMemo(
		() =>
			customMedications.filter(
				(item) =>
					!q ||
					item.name.toLowerCase().includes(q) ||
					t("medicationsTitle").toLowerCase().includes(q) ||
					"medications".includes(q),
			),
		[customMedications, q, t],
	);

	const showSleep =
		visibleSet.has("sleep") &&
		(!q ||
			t("sleepTitle").toLowerCase().includes(q) ||
			"sleep wake duration quality".includes(q));

	const showReadiness =
		visibleSet.has("readiness") &&
		(!q ||
			t("readinessTitle").toLowerCase().includes(q) ||
			"energy stress mood hydration notes readiness".includes(q));

	const computedSleepMinutes = computeSleepDurationMinutes(
		activeDraft.sleepTime,
		activeDraft.wakeTime,
	);
	const formattedSleep = formatSleepDuration(computedSleepMinutes);
	const activePainTags = activeDraft.painTags.filter(
		(tag) => tag !== "pain_free",
	);
	const showCrampScale =
		tracksPeriod &&
		(Boolean(activeDraft.periodFlow) ||
			activeDraft.painTags.includes("cramps"));

	function toggleCustomItemSlug(
		field: "supplements" | "medications",
		slug: string,
	) {
		const current = activeDraft[field];
		const next = current.includes(slug)
			? current.filter((item) => item !== slug)
			: [...current, slug];
		patchDraft({ [field]: next });
	}

	async function handleSubmitCustom(kind: WellnessItemKindValue) {
		const raw = kind === "SUPPLEMENT" ? newSupplementName : newMedicationName;
		const trimmed = raw.trim();
		if (!trimmed) return;
		const ok = await onAddCustomItem(kind, trimmed);
		if (ok) {
			if (kind === "SUPPLEMENT") setNewSupplementName("");
			else setNewMedicationName("");
		}
	}

	return (
		<div className="flex flex-col gap-4">
			{tracksPeriod &&
				visibleSet.has("period") &&
				filteredPeriod.length > 0 && (
					<Frame spacing="sm">
						<FrameHeader>
							<div className="flex items-center justify-between gap-2">
								<FrameTitle className="flex items-center gap-2">
									<Droplets className="size-4 text-destructive" />
									{t("periodTitle")}
								</FrameTitle>
								<Button
									type="button"
									variant="ghost"
									size="xs"
									onClick={() => onOpenLearnMore("period")}
								>
									<Info className="size-3.5" />
									{t("learnMoreLink")}
								</Button>
							</div>
						</FrameHeader>
						<FramePanel className="space-y-2">
							<ToggleGroup
								variant="outline"
								className="w-full flex-wrap"
								value={activeDraft.periodFlow ? [activeDraft.periodFlow] : []}
								onValueChange={(values) =>
									patchDraft({
										periodFlow: values[0] ?? null,
										...(values[0] === undefined &&
										!activeDraft.painTags.includes("cramps")
											? { crampSeverity: null }
											: {}),
									})
								}
							>
								{filteredPeriod.map((flow) => {
									const Icon = getPeriodFlowIcon(flow);
									return (
										<ToggleGroupItem key={flow} value={flow}>
											<Icon className="size-3.5 text-destructive" />
											{t(`periodOptions.${flow}`)}
										</ToggleGroupItem>
									);
								})}
							</ToggleGroup>

							{showCrampScale && (
								<SeverityScaleRow
									label={t("crampSeverityLabel")}
									value={activeDraft.crampSeverity}
									onChange={(next) => patchDraft({ crampSeverity: next })}
								/>
							)}
						</FramePanel>
					</Frame>
				)}

			{visibleSet.has("pain") && filteredPain.length > 0 && (
				<Frame spacing="sm">
					<FrameHeader>
						<div className="flex items-center justify-between gap-2">
							<FrameTitle className="flex items-center gap-2">
								<HeartPulse className="size-4 text-primary" />
								{t("painTitle")}
							</FrameTitle>
							<Button
								type="button"
								variant="ghost"
								size="xs"
								onClick={() => onOpenLearnMore("pain")}
							>
								<Info className="size-3.5" />
								{t("learnMoreLink")}
							</Button>
						</div>
					</FrameHeader>
					<FramePanel className="space-y-3">
						<ToggleGroup
							multiple
							variant="outline"
							className="w-full flex-wrap"
							value={activeDraft.painTags}
							onValueChange={(values) => {
								const nextList = values.map(String);
								const clicked =
									nextList.find((v) => !activeDraft.painTags.includes(v)) ??
									activeDraft.painTags.find((v) => !nextList.includes(v));
								const resolvedTags = clicked
									? togglePainTag(
											activeDraft.painTags,
											clicked as PainTagOption,
										)
									: nextList;
								const hasPain = resolvedTags.some((tag) => tag !== "pain_free");
								const prunedDetails =
									hasPain && activeDraft.painDetails
										? Object.fromEntries(
												Object.entries(activeDraft.painDetails).filter(([k]) =>
													resolvedTags.includes(k),
												),
											)
										: null;
								patchDraft({
									painTags: resolvedTags,
									painSeverity: hasPain ? activeDraft.painSeverity : null,
									painDetails:
										prunedDetails && Object.keys(prunedDetails).length > 0
											? prunedDetails
											: null,
									...(tracksPeriod &&
									!resolvedTags.includes("cramps") &&
									!activeDraft.periodFlow
										? { crampSeverity: null }
										: {}),
								});
							}}
						>
							{filteredPain.map((tag) => {
								const Icon = getPainTagIcon(tag);
								return (
									<ToggleGroupItem key={tag} value={tag}>
										<Icon className="size-3.5 text-primary" />
										{t(`painOptions.${tag}`)}
									</ToggleGroupItem>
								);
							})}
						</ToggleGroup>

						{activePainTags.length > 0 && (
							<div className="space-y-2 border-t pt-2">
								<SeverityScaleRow
									label={t("painSeverityLabel")}
									value={activeDraft.painSeverity}
									onChange={(next) => patchDraft({ painSeverity: next })}
								/>

								{activePainTags.map((tag) => {
									const tagVal = activeDraft.painDetails?.[tag] ?? null;
									return (
										<div
											key={`detail-${tag}`}
											className="flex items-center justify-between gap-2 text-xs"
										>
											<span className="truncate text-muted-foreground">
												{t(`painOptions.${tag}`)}
											</span>
											<div className="flex items-center gap-1">
												{SEVERITY_STEPS.map((step) => (
													<Button
														key={`${tag}-${step}`}
														type="button"
														size="xs"
														variant={tagVal === step ? "default" : "outline"}
														onClick={() => {
															const nextMap = {
																...(activeDraft.painDetails ?? {}),
															};
															if (tagVal === step) {
																delete nextMap[tag];
															} else {
																nextMap[tag] = step;
															}
															patchDraft({
																painDetails:
																	Object.keys(nextMap).length > 0
																		? nextMap
																		: null,
															});
														}}
													>
														{step}
													</Button>
												))}
											</div>
										</div>
									);
								})}
							</div>
						)}
					</FramePanel>
				</Frame>
			)}

			{visibleSet.has("supplements") &&
				(filteredPresetSupps.length > 0 || filteredCustomSupps.length > 0) && (
					<Frame spacing="sm">
						<FrameHeader>
							<div className="flex items-center justify-between gap-2">
								<FrameTitle className="flex items-center gap-2">
									<Sparkles className="size-4 text-primary" />
									{t("supplementsTitle")}
								</FrameTitle>
								<Button
									type="button"
									variant="ghost"
									size="xs"
									onClick={() => onOpenLearnMore("supplements")}
								>
									<Info className="size-3.5" />
									{t("learnMoreLink")}
								</Button>
							</div>
						</FrameHeader>
						<FramePanel className="space-y-3">
							<ToggleGroup
								multiple
								variant="outline"
								className="w-full flex-wrap"
								value={activeDraft.supplements.filter((s) =>
									(SUPPLEMENT_OPTIONS as readonly string[]).includes(s),
								)}
								onValueChange={(values) => {
									const customSelected = activeDraft.supplements.filter(
										(s) =>
											!(SUPPLEMENT_OPTIONS as readonly string[]).includes(s),
									);
									patchDraft({
										supplements: [...values.map(String), ...customSelected],
									});
								}}
							>
								{filteredPresetSupps.map((item) => (
									<ToggleGroupItem key={item} value={item}>
										<Sparkles className="size-3.5 text-primary" />
										{t(`supplementOptions.${item}`)}
									</ToggleGroupItem>
								))}
							</ToggleGroup>

							{filteredCustomSupps.length > 0 && (
								<div className="flex flex-wrap gap-1.5">
									{filteredCustomSupps.map((item) => {
										const isSelected = activeDraft.supplements.includes(
											item.slug,
										);
										return (
											<div
												key={item.id}
												className="inline-flex items-center overflow-hidden rounded-lg border"
											>
												<Button
													type="button"
													size="xs"
													variant={isSelected ? "default" : "ghost"}
													className="rounded-none"
													onClick={() =>
														toggleCustomItemSlug("supplements", item.slug)
													}
												>
													{item.name}
												</Button>
												<Button
													type="button"
													size="icon-xs"
													variant="ghost"
													className="rounded-none border-l"
													aria-label={t("archiveCustomItemAria", {
														name: item.name,
													})}
													onClick={() => onArchiveCustomItem(item.id)}
												>
													<X className="size-3" />
												</Button>
											</div>
										);
									})}
								</div>
							)}

							<div className="flex items-center gap-2 pt-1">
								<Input
									value={newSupplementName}
									maxLength={40}
									onChange={(e) => setNewSupplementName(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											void handleSubmitCustom("SUPPLEMENT");
										}
									}}
									placeholder={t("addCustomSupplementPlaceholder")}
								/>
								<Button
									type="button"
									size="sm"
									variant="outline"
									disabled={
										addingItemKind === "SUPPLEMENT" || !newSupplementName.trim()
									}
									onClick={() => void handleSubmitCustom("SUPPLEMENT")}
								>
									<Plus className="size-3.5" />
									{t("addCustomButton")}
								</Button>
							</div>
						</FramePanel>
					</Frame>
				)}

			{visibleSet.has("medications") &&
				(filteredPresetMeds.length > 0 || filteredCustomMeds.length > 0) && (
					<Frame spacing="sm">
						<FrameHeader>
							<div className="flex items-center justify-between gap-2">
								<FrameTitle className="flex items-center gap-2">
									<Pill className="size-4 text-primary" />
									{t("medicationsTitle")}
								</FrameTitle>
								<Button
									type="button"
									variant="ghost"
									size="xs"
									onClick={() => onOpenLearnMore("medications")}
								>
									<Info className="size-3.5" />
									{t("learnMoreLink")}
								</Button>
							</div>
						</FrameHeader>
						<FramePanel className="space-y-3">
							<ToggleGroup
								multiple
								variant="outline"
								className="w-full flex-wrap"
								value={activeDraft.medications.filter((m) =>
									(MEDICATION_OPTIONS as readonly string[]).includes(m),
								)}
								onValueChange={(values) => {
									const customSelected = activeDraft.medications.filter(
										(m) =>
											!(MEDICATION_OPTIONS as readonly string[]).includes(m),
									);
									patchDraft({
										medications: [...values.map(String), ...customSelected],
									});
								}}
							>
								{filteredPresetMeds.map((item) => (
									<ToggleGroupItem key={item} value={item}>
										<Pill className="size-3.5 text-primary" />
										{t(`medicationOptions.${item}`)}
									</ToggleGroupItem>
								))}
							</ToggleGroup>

							{filteredCustomMeds.length > 0 && (
								<div className="flex flex-wrap gap-1.5">
									{filteredCustomMeds.map((item) => {
										const isSelected = activeDraft.medications.includes(
											item.slug,
										);
										return (
											<div
												key={item.id}
												className="inline-flex items-center overflow-hidden rounded-lg border"
											>
												<Button
													type="button"
													size="xs"
													variant={isSelected ? "default" : "ghost"}
													className="rounded-none"
													onClick={() =>
														toggleCustomItemSlug("medications", item.slug)
													}
												>
													{item.name}
												</Button>
												<Button
													type="button"
													size="icon-xs"
													variant="ghost"
													className="rounded-none border-l"
													aria-label={t("archiveCustomItemAria", {
														name: item.name,
													})}
													onClick={() => onArchiveCustomItem(item.id)}
												>
													<X className="size-3" />
												</Button>
											</div>
										);
									})}
								</div>
							)}

							<div className="flex items-center gap-2 pt-1">
								<Input
									value={newMedicationName}
									maxLength={40}
									onChange={(e) => setNewMedicationName(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											void handleSubmitCustom("MEDICATION");
										}
									}}
									placeholder={t("addCustomMedicationPlaceholder")}
								/>
								<Button
									type="button"
									size="sm"
									variant="outline"
									disabled={
										addingItemKind === "MEDICATION" || !newMedicationName.trim()
									}
									onClick={() => void handleSubmitCustom("MEDICATION")}
								>
									<Plus className="size-3.5" />
									{t("addCustomButton")}
								</Button>
							</div>
						</FramePanel>
					</Frame>
				)}

			{showSleep && (
				<Frame spacing="sm">
					<FrameHeader>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<FrameTitle className="flex items-center gap-2">
								<Moon className="size-4 text-primary" />
								{t("sleepTitle")}
							</FrameTitle>
							<div className="flex items-center gap-1.5">
								{formattedSleep && (
									<Badge variant="secondary" size="sm">
										{formattedSleep}
									</Badge>
								)}
								<Button
									type="button"
									variant="ghost"
									size="xs"
									onClick={() => onOpenLearnMore("sleep")}
								>
									<Info className="size-3.5" />
								</Button>
							</div>
						</div>
						<FrameDescription>{t("sleepDescription")}</FrameDescription>
					</FrameHeader>
					<FramePanel className="space-y-3">
						<div className="grid grid-cols-2 gap-3">
							<Field>
								<FieldLabel htmlFor="wellness-sleep-time">
									{t("sleepTimeLabel")}
								</FieldLabel>
								<Input
									id="wellness-sleep-time"
									type="time"
									value={activeDraft.sleepTime ?? ""}
									onChange={(e) =>
										patchDraft({ sleepTime: e.target.value || null })
									}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="wellness-wake-time">
									{t("wakeTimeLabel")}
								</FieldLabel>
								<Input
									id="wellness-wake-time"
									type="time"
									value={activeDraft.wakeTime ?? ""}
									onChange={(e) =>
										patchDraft({ wakeTime: e.target.value || null })
									}
								/>
							</Field>
						</div>

						<SeverityScaleRow
							label={t("sleepQualityLabel")}
							value={activeDraft.sleepQuality}
							onChange={(next) => patchDraft({ sleepQuality: next })}
						/>
					</FramePanel>
				</Frame>
			)}

			{showReadiness && (
				<Frame spacing="sm">
					<FrameHeader>
						<FrameTitle className="flex items-center gap-2">
							<BatteryCharging className="size-4 text-primary" />
							{t("readinessTitle")}
						</FrameTitle>
						<FrameDescription>{t("readinessDescription")}</FrameDescription>
					</FrameHeader>
					<FramePanel className="space-y-4">
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<div>
								<SeverityScaleRow
									label={t("energyLevelLabel")}
									value={activeDraft.energyLevel}
									onChange={(next) => patchDraft({ energyLevel: next })}
								/>
							</div>
							<div>
								<SeverityScaleRow
									label={t("stressLevelLabel")}
									value={activeDraft.stressLevel}
									onChange={(next) => patchDraft({ stressLevel: next })}
								/>
							</div>
						</div>

						<Field>
							<FieldLabel>{t("moodTitle")}</FieldLabel>
							<ToggleGroup
								multiple
								variant="outline"
								className="w-full flex-wrap"
								value={activeDraft.moodTags}
								onValueChange={(values) =>
									patchDraft({
										moodTags: values.map(String) as MoodTagOption[],
									})
								}
							>
								{MOOD_TAG_OPTIONS.map((mood) => (
									<ToggleGroupItem key={mood} value={mood}>
										<Flame className="size-3.5 text-primary" />
										{t(`moodOptions.${mood}`)}
									</ToggleGroupItem>
								))}
							</ToggleGroup>
						</Field>

						<div className="space-y-2">
							<div className="flex items-center justify-between text-xs">
								<span className="flex items-center gap-1.5 font-medium">
									<GlassWater className="size-3.5 text-info" />
									{t("hydrationLabel")}
								</span>
								<Badge variant="info-light" size="xs">
									{t("hydrationValue", { ml: activeDraft.hydrationMl ?? 0 })}
								</Badge>
							</div>
							<div className="flex flex-wrap items-center gap-1.5">
								{HYDRATION_PRESETS_ML.map((ml) => (
									<Button
										key={ml}
										type="button"
										size="xs"
										variant="outline"
										onClick={() =>
											patchDraft({
												hydrationMl: Math.min(
													10000,
													(activeDraft.hydrationMl ?? 0) + ml,
												),
											})
										}
									>
										+{ml} ml
									</Button>
								))}
								{(activeDraft.hydrationMl ?? 0) > 0 && (
									<Button
										type="button"
										size="xs"
										variant="ghost"
										onClick={() => patchDraft({ hydrationMl: null })}
									>
										{t("hydrationReset")}
									</Button>
								)}
							</div>
						</div>

						<Field>
							<FieldLabel htmlFor="wellness-notes">
								{t("notesLabel")}
							</FieldLabel>
							<Textarea
								id="wellness-notes"
								maxLength={300}
								value={activeDraft.notes ?? ""}
								onChange={(e) => patchDraft({ notes: e.target.value || null })}
								placeholder={t("notesPlaceholder")}
							/>
						</Field>
					</FramePanel>
				</Frame>
			)}
		</div>
	);
}
