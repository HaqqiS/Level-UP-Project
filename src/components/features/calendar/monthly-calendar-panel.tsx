"use client";
import { cn } from "cn";
import {
	Check,
	ChevronLeft,
	ChevronRight,
	Droplet,
	Droplets,
	Dumbbell,
	HeartPulse,
	Moon,
	Pill,
	Snowflake,
	Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSleepDuration } from "@/lib/wellness/cycle-and-wellness";
import type {
	CalendarDayLogView,
	CalendarDaySummary,
	MonthlyWellnessInsights,
} from "@/server/services/wellness-service";

const WEEKDAY_HEADERS = [
	{ id: "sun", label: "S" },
	{ id: "mon", label: "M" },
	{ id: "tue", label: "T" },
	{ id: "wed", label: "W" },
	{ id: "thu", label: "T" },
	{ id: "fri", label: "F" },
	{ id: "sat", label: "S" },
] as const;

export type CalendarIndicatorFilter =
	| "period"
	| "pain"
	| "supplements"
	| "medication";

export type CalendarDayIndicatorKind =
	| "period_confirmed"
	| "period_predicted"
	| "pain"
	| "supplements"
	| "medication";

export type CalendarDayVisualState = {
	isSelected: boolean;
	hasConfirmedPeriod: boolean;
	isPredictedPeriod: boolean;
	hasPain: boolean;
	hasSupplements: boolean;
	hasMedication: boolean;
};

/**
 * Derives semantic display flags for a calendar day cell or week-strip pill.
 */
export function getCalendarDayVisualState({
	day,
	dayLog,
	selectedDateKey,
	tracksPeriod,
}: {
	day: CalendarDaySummary;
	dayLog: CalendarDayLogView | null | undefined;
	selectedDateKey: string;
	tracksPeriod: boolean;
}): CalendarDayVisualState {
	const isSelected = day.dateKey === selectedDateKey;
	const clearedPeriodFlowLocally = Boolean(
		day.log?.periodFlow && dayLog && !dayLog.periodFlow,
	);
	const hasConfirmedPeriod =
		tracksPeriod &&
		!clearedPeriodFlowLocally &&
		(Boolean(dayLog?.periodFlow) ||
			Boolean(day.cyclePhase?.isConfirmedPeriodDay));
	const isPredictedPeriod =
		tracksPeriod &&
		!hasConfirmedPeriod &&
		Boolean(day.cyclePhase?.isPredictedPeriodDay);
	const hasPain = Boolean(
		dayLog &&
			(dayLog.painTags.some((tag) => tag !== "pain_free") ||
				(dayLog.painSeverity ?? 0) > 0 ||
				(dayLog.crampSeverity ?? 0) > 0),
	);
	const hasSupplements = (dayLog?.supplements.length ?? 0) > 0;
	const hasMedication = (dayLog?.medications.length ?? 0) > 0;

	return {
		isSelected,
		hasConfirmedPeriod,
		isPredictedPeriod,
		hasPain,
		hasSupplements,
		hasMedication,
	};
}

/**
 * Resolves which indicator icons should appear under a calendar date.
 * Predicted period stays visible whenever `isPredictedPeriod` is true; all other indicators depend on active filter badges.
 */
export function getVisibleCalendarIndicators(
	state: CalendarDayVisualState,
	activeIndicators: readonly CalendarIndicatorFilter[],
): CalendarDayIndicatorKind[] {
	const items: CalendarDayIndicatorKind[] = [];

	if (activeIndicators.includes("period") && state.hasConfirmedPeriod) {
		items.push("period_confirmed");
	} else if (state.isPredictedPeriod) {
		items.push("period_predicted");
	}
	if (activeIndicators.includes("pain") && state.hasPain) {
		items.push("pain");
	}
	if (activeIndicators.includes("supplements") && state.hasSupplements) {
		items.push("supplements");
	}
	if (activeIndicators.includes("medication") && state.hasMedication) {
		items.push("medication");
	}

	return items;
}

/**
 * Builds semantic variant and borderless surface classes for a calendar day button.
 * Day backgrounds are reserved solely for selected day, workout done, and streak freeze.
 */
export function getCalendarDayButtonAppearance({
	day,
	state,
	layout = "month",
}: {
	day: CalendarDaySummary;
	state: CalendarDayVisualState;
	layout?: "month" | "strip";
}): {
	variant: "default" | "ghost";
	className: string;
} {
	const baseLayout =
		layout === "strip"
			? "h-auto flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1.5"
			: "h-auto min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1.5";

	if (state.isSelected) {
		return {
			variant: "default",
			className: cn(
				baseLayout,
				"bg-primary text-primary-foreground hover:bg-primary/90",
			),
		};
	}

	let surfaceClass: string | undefined;
	if (day.hasWorkout) {
		surfaceClass =
			"bg-emerald-500/15 text-emerald-950 hover:bg-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-100 dark:hover:bg-emerald-500/25";
	} else if (day.isStreakFrozen) {
		surfaceClass =
			"bg-sky-500/15 text-sky-900 hover:bg-sky-500/20 dark:bg-sky-500/20 dark:text-sky-100 dark:hover:bg-sky-500/25";
	}

	const todayClass = day.isToday ? "font-bold" : undefined;

	return {
		variant: "ghost",
		className: cn(baseLayout, surfaceClass, todayClass),
	};
}

export function getIndicatorPresentation(
	kind: CalendarDayIndicatorKind,
	isSelected: boolean,
) {
	switch (kind) {
		case "period_confirmed":
			return {
				Icon: Droplets,
				labelKey: "indicatorAriaConfirmedPeriod" as const,
				colorClass: isSelected
					? "fill-current text-rose-200 dark:text-rose-700"
					: "fill-current text-rose-500 dark:text-rose-400",
			};
		case "period_predicted":
			return {
				Icon: Droplet,
				labelKey: "indicatorAriaPredictedPeriod" as const,
				colorClass: isSelected
					? "fill-none text-rose-200/80 dark:text-rose-700/80"
					: "fill-none text-rose-400 dark:text-rose-400/80",
			};
		case "pain":
			return {
				Icon: HeartPulse,
				labelKey: "indicatorAriaPain" as const,
				colorClass: isSelected
					? "text-amber-200 dark:text-amber-700"
					: "text-amber-500 dark:text-amber-400",
			};
		case "supplements":
			return {
				Icon: Sparkles,
				labelKey: "indicatorAriaSupplements" as const,
				colorClass: isSelected
					? "text-teal-200 dark:text-teal-700"
					: "text-teal-600 dark:text-teal-400",
			};
		case "medication":
			return {
				Icon: Pill,
				labelKey: "indicatorAriaMedication" as const,
				colorClass: isSelected
					? "text-violet-200 dark:text-violet-700"
					: "text-violet-600 dark:text-violet-400",
			};
	}
}

/**
 * Renders enlarged colored mini icons below dayOfMonth only when matching filter badges are active.
 */
export function CalendarDayIndicators({
	state,
	activeIndicators,
	layout = "month",
}: {
	state: CalendarDayVisualState;
	activeIndicators: readonly CalendarIndicatorFilter[];
	layout?: "month" | "strip";
}) {
	const t = useTranslations("calendar");
	const visible = getVisibleCalendarIndicators(state, activeIndicators);
	const iconSize = visible.length >= 4 ? "size-2.5" : "size-3";

	return (
		<span
			className={cn(
				"flex items-center justify-center gap-0.5",
				layout === "strip" ? "h-3.5" : "h-4",
			)}
		>
			{visible.map((kind) => {
				const { Icon, labelKey, colorClass } = getIndicatorPresentation(
					kind,
					state.isSelected,
				);
				return (
					<span key={kind} className="inline-flex items-center">
						<Icon aria-hidden="true" className={cn(iconSize, colorClass)} />
						<span className="sr-only">{t(labelKey)}</span>
					</span>
				);
			})}
		</span>
	);
}

const INDICATOR_FILTERS: readonly {
	key: CalendarIndicatorFilter;
	requiresPeriod: boolean;
	activeClass: string;
}[] = [
	{
		key: "period",
		requiresPeriod: true,
		activeClass:
			"bg-rose-500/20 text-rose-700 hover:bg-rose-500/25 dark:bg-rose-500/25 dark:text-rose-300 dark:hover:bg-rose-500/30",
	},
	{
		key: "pain",
		requiresPeriod: false,
		activeClass:
			"bg-amber-500/20 text-amber-800 hover:bg-amber-500/25 dark:bg-amber-500/25 dark:text-amber-300 dark:hover:bg-amber-500/30",
	},
	{
		key: "supplements",
		requiresPeriod: false,
		activeClass:
			"bg-teal-500/20 text-teal-800 hover:bg-teal-500/25 dark:bg-teal-500/25 dark:text-teal-300 dark:hover:bg-teal-500/30",
	},
	{
		key: "medication",
		requiresPeriod: false,
		activeClass:
			"bg-violet-500/20 text-violet-800 hover:bg-violet-500/25 dark:bg-violet-500/25 dark:text-violet-300 dark:hover:bg-violet-500/30",
	},
];

function renderIndicatorFilterIcon(
	key: CalendarIndicatorFilter,
	isActive: boolean,
) {
	switch (key) {
		case "period":
			return <Droplets className={cn("size-3", isActive && "fill-current")} />;
		case "pain":
			return <HeartPulse className="size-3" />;
		case "supplements":
			return <Sparkles className="size-3" />;
		case "medication":
			return <Pill className="size-3" />;
	}
}

function getIndicatorFilterLabelKey(key: CalendarIndicatorFilter) {
	switch (key) {
		case "period":
			return "legendPeriod" as const;
		case "pain":
			return "legendPain" as const;
		case "supplements":
			return "legendSupplements" as const;
		case "medication":
			return "legendMedication" as const;
	}
}

export function MonthlyCalendarPanel({
	monthLabel,
	prevMonthKey,
	nextMonthKey,
	selectedDateKey,
	tracksPeriod,
	days,
	logsByDate,
	monthlyInsights,
	activeIndicators,
	onToggleIndicator,
	onSelectDate,
}: {
	monthLabel: string;
	prevMonthKey: string;
	nextMonthKey: string;
	selectedDateKey: string;
	tracksPeriod: boolean;
	days: CalendarDaySummary[];
	logsByDate: Record<string, CalendarDayLogView>;
	monthlyInsights: MonthlyWellnessInsights;
	activeIndicators: readonly CalendarIndicatorFilter[];
	onToggleIndicator: (filter: CalendarIndicatorFilter) => void;
	onSelectDate: (dateKey: string) => void;
}) {
	const t = useTranslations("calendar");
	const formattedAvgSleep = formatSleepDuration(
		monthlyInsights.avgSleepMinutes,
	);
	const topPain = monthlyInsights.topPainTags[0] ?? null;

	return (
		<Card size="sm">
			<CardHeader>
				<div className="flex items-center justify-between gap-2">
					<Button
						variant="ghost"
						size="icon-sm"
						nativeButton={false}
						aria-label={t("prevMonthAria")}
						render={<Link href={`/calendar?month=${prevMonthKey}`} />}
					>
						<ChevronLeft />
					</Button>
					<CardTitle>{monthLabel}</CardTitle>
					<Button
						variant="ghost"
						size="icon-sm"
						nativeButton={false}
						aria-label={t("nextMonthAria")}
						render={<Link href={`/calendar?month=${nextMonthKey}`} />}
					>
						<ChevronRight />
					</Button>
				</div>
			</CardHeader>

			<CardContent className="space-y-3">
				<div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
					{WEEKDAY_HEADERS.map((item) => (
						<span key={item.id}>{item.label}</span>
					))}
				</div>

				<div className="grid grid-cols-7 gap-1">
					{days.map((day) => {
						const dayLog = logsByDate[day.dateKey] ?? day.log;
						const state = getCalendarDayVisualState({
							day,
							dayLog,
							selectedDateKey,
							tracksPeriod,
						});
						const appearance = getCalendarDayButtonAppearance({
							day,
							state,
							layout: "month",
						});

						return (
							<Button
								key={day.dateKey}
								type="button"
								size="xs"
								variant={appearance.variant}
								className={appearance.className}
								aria-pressed={state.isSelected}
								onClick={() => onSelectDate(day.dateKey)}
							>
								<span
									className={cn(
										day.inCurrentMonth
											? undefined
											: state.isSelected
												? "opacity-75"
												: "text-muted-foreground/50",
										day.isToday &&
											!state.isSelected &&
											"font-bold text-primary underline decoration-primary decoration-2 underline-offset-2",
									)}
								>
									{day.dayOfMonth}
								</span>
								<CalendarDayIndicators
									state={state}
									activeIndicators={activeIndicators}
									layout="month"
								/>
							</Button>
						);
					})}
				</div>

				<div className="space-y-2 rounded-xl bg-muted/35 p-2.5">
					<div className="flex flex-wrap items-center gap-1.5">
						<span className="text-[0.68rem] text-muted-foreground">
							{t("legendDayFillLabel")}
						</span>
						<Badge variant="success-light" size="sm" className="border-0">
							<Check className="size-3" />
							{t("legendWorkout")}
						</Badge>
						<Badge
							variant="secondary"
							size="sm"
							className="border-0 bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300"
						>
							<Snowflake className="size-3" />
							{t("legendFreeze")}
						</Badge>
						{tracksPeriod && (
							<Badge
								variant="secondary"
								size="sm"
								className="border-0 bg-rose-500/12 text-rose-700 dark:bg-rose-500/18 dark:text-rose-300"
							>
								<Droplet className="size-3 fill-none" />
								{t("legendPeriodPredicted")}
							</Badge>
						)}
					</div>

					<div className="flex flex-wrap items-center gap-1.5">
						<span className="text-[0.68rem] text-muted-foreground">
							{t("legendIndicatorsLabel")}
						</span>
						{INDICATOR_FILTERS.filter(
							(item) => !item.requiresPeriod || tracksPeriod,
						).map((item) => {
							const isActive = activeIndicators.includes(item.key);
							return (
								<Badge
									key={item.key}
									variant="secondary"
									size="sm"
									className={cn(
										"cursor-pointer border-0 transition-colors",
										isActive
											? item.activeClass
											: "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground",
									)}
									render={
										<button
											type="button"
											aria-pressed={isActive}
											onClick={() => onToggleIndicator(item.key)}
										/>
									}
								>
									{renderIndicatorFilterIcon(item.key, isActive)}
									{t(getIndicatorFilterLabelKey(item.key))}
								</Badge>
							);
						})}
					</div>
				</div>

				<div className="grid grid-cols-2 gap-2 pt-1">
					<div className="rounded-xl bg-muted/40 p-2.5">
						<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<Moon className="size-3.5 text-primary" />
							<span>{t("insightsAvgSleep")}</span>
						</div>
						<div className="mt-1 text-sm font-semibold">
							{formattedAvgSleep ?? "—"}
						</div>
						<div className="text-[0.68rem] text-muted-foreground">
							{t("insightsSleepDays", {
								count: monthlyInsights.sleepLoggedDays,
							})}
						</div>
					</div>

					<div className="rounded-xl bg-muted/40 p-2.5">
						<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<Dumbbell className="size-3.5 text-primary" />
							<span>{t("insightsWorkouts")}</span>
						</div>
						<div className="mt-1 text-sm font-semibold">
							{monthlyInsights.workoutsCompletedCount}
						</div>
						<div className="text-[0.68rem] text-muted-foreground">
							{t("insightsCompletedThisMonth")}
						</div>
					</div>

					{tracksPeriod ? (
						<div className="rounded-xl bg-muted/40 p-2.5">
							<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
								<Droplets className="size-3.5 text-destructive" />
								<span>{t("insightsNextPeriod")}</span>
							</div>
							<div className="mt-1 text-sm font-semibold">
								{monthlyInsights.daysUntilNextPeriod !== null
									? t("insightsNextPeriodDays", {
											days: monthlyInsights.daysUntilNextPeriod,
										})
									: "—"}
							</div>
							{monthlyInsights.predictionWindowDays && (
								<div className="text-[0.68rem] text-muted-foreground">
									{t("insightsWindow", {
										days: monthlyInsights.predictionWindowDays,
									})}
								</div>
							)}
						</div>
					) : (
						<div className="col-span-2 rounded-xl bg-muted/40 p-2.5">
							<div className="text-xs text-muted-foreground">
								{t("insightsTopSymptom")}
							</div>
							<div className="mt-1 truncate text-sm font-semibold">
								{topPain
									? t(`painOptions.${topPain.tag}`)
									: t("insightsNoSymptoms")}
							</div>
							{topPain && (
								<div className="text-[0.68rem] text-muted-foreground">
									{t("insightsSymptomDays", { count: topPain.count })}
								</div>
							)}
						</div>
					)}

					{tracksPeriod && (
						<div className="rounded-xl bg-muted/40 p-2.5">
							<div className="text-xs text-muted-foreground">
								{t("insightsTopSymptom")}
							</div>
							<div className="mt-1 truncate text-sm font-semibold">
								{topPain
									? t(`painOptions.${topPain.tag}`)
									: t("insightsNoSymptoms")}
							</div>
							{topPain && (
								<div className="text-[0.68rem] text-muted-foreground">
									{t("insightsSymptomDays", { count: topPain.count })}
								</div>
							)}
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
