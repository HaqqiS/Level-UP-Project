"use client";
import { cn } from "cn";
import {
	AlertCircle,
	Calendar,
	Check,
	ChevronDown,
	ChevronUp,
	History,
	Loader2,
	Search,
	SlidersHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/reui/badge";
import { Frame, FrameHeader, FrameTitle } from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import type {
	CycleRegularityValue,
	MedicationOption,
	MoodTagOption,
	PainTagOption,
	PeriodFlowOption,
	WellnessItemKindValue,
} from "@/lib/wellness/cycle-and-wellness";
import {
	archiveCustomWellnessItemAction,
	createCustomWellnessItemAction,
	saveDailyWellnessLogAction,
} from "@/server/actions/wellness";
import type {
	CalendarDayLogView,
	CalendarDaySummary,
	CustomWellnessItemView,
	MenstrualCycleView,
	MonthlyWellnessInsights,
} from "@/server/services/wellness-service";
import { DayWorkoutRecapCard } from "./day-workout-recap-card";
import {
	CalendarDayIndicators,
	type CalendarIndicatorFilter,
	getCalendarDayButtonAppearance,
	getCalendarDayVisualState,
	MonthlyCalendarPanel,
} from "./monthly-calendar-panel";
import { WellnessCategoryCards } from "./wellness-category-cards";
import {
	ALL_WELLNESS_CATEGORIES,
	CategoryFilterSheet,
	CycleHistorySheet,
	LearnMoreSheet,
	type LearnMoreTopic,
	type WellnessCategoryKey,
} from "./wellness-sheets";

const FILTER_STORAGE_KEY = "cq-calendar-visible-categories";

function emptyLogForDate(date: string): CalendarDayLogView {
	return {
		date,
		periodFlow: null,
		painTags: [],
		painSeverity: null,
		painDetails: null,
		crampSeverity: null,
		medications: [],
		supplements: [],
		sleepTime: null,
		wakeTime: null,
		sleepDurationMinutes: null,
		sleepQuality: null,
		energyLevel: null,
		stressLevel: null,
		moodTags: [],
		hydrationMl: null,
		notes: null,
	};
}

export function CalendarWellnessView({
	monthLabel,
	prevMonthKey,
	nextMonthKey,
	initialSelectedDateKey,
	tracksPeriod,
	cycleRegularity,
	days,
	customItems: initialCustomItems,
	cycles,
	monthlyInsights,
}: {
	monthLabel: string;
	prevMonthKey: string;
	nextMonthKey: string;
	initialSelectedDateKey: string;
	tracksPeriod: boolean;
	cycleRegularity: CycleRegularityValue;
	days: CalendarDaySummary[];
	customItems: CustomWellnessItemView[];
	cycles: MenstrualCycleView[];
	monthlyInsights: MonthlyWellnessInsights;
}) {
	const t = useTranslations("calendar");
	const router = useRouter();

	const [selectedDateKey, setSelectedDateKey] = useState(
		initialSelectedDateKey,
	);
	const [logsByDate, setLogsByDate] = useState<
		Record<string, CalendarDayLogView>
	>(() => {
		const initial: Record<string, CalendarDayLogView> = {};
		for (const day of days) {
			if (day.log) initial[day.dateKey] = day.log;
		}
		return initial;
	});
	const logsRef = useRef(logsByDate);
	logsRef.current = logsByDate;

	const dirtyDatesRef = useRef<Set<string>>(new Set());
	const inFlightDatesRef = useRef<Set<string>>(new Set());
	const saveSeqRef = useRef<Record<string, number>>({});
	const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const prevInitialDateRef = useRef(initialSelectedDateKey);

	const [saveStatus, setSaveStatus] = useState<
		"idle" | "saving" | "saved" | "error"
	>("idle");
	const [lastErrorDate, setLastErrorDate] = useState<string | null>(null);

	const [showMonthGrid, setShowMonthGrid] = useState(false);
	const [activeIndicators, setActiveIndicators] = useState<
		CalendarIndicatorFilter[]
	>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [visibleCategories, setVisibleCategories] = useState<
		WellnessCategoryKey[]
	>([...ALL_WELLNESS_CATEGORIES]);
	const [customItems, setCustomItems] =
		useState<CustomWellnessItemView[]>(initialCustomItems);
	const [addingItemKind, setAddingItemKind] =
		useState<WellnessItemKindValue | null>(null);

	const [filterOpen, setFilterOpen] = useState(false);
	const [learnMoreTopic, setLearnMoreTopic] = useState<LearnMoreTopic | null>(
		null,
	);
	const [cycleHistoryOpen, setCycleHistoryOpen] = useState(false);

	useEffect(() => {
		try {
			const raw = window.localStorage.getItem(FILTER_STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as unknown;
				if (Array.isArray(parsed) && parsed.length > 0) {
					const valid = parsed.filter((c): c is WellnessCategoryKey =>
						ALL_WELLNESS_CATEGORIES.includes(c as WellnessCategoryKey),
					);
					if (valid.length > 0) setVisibleCategories(valid);
				}
			}
		} catch {
			// Ignore malformed localStorage entries
		}
	}, []);

	useEffect(() => {
		setCustomItems(initialCustomItems);
	}, [initialCustomItems]);

	useEffect(() => {
		if (prevInitialDateRef.current !== initialSelectedDateKey) {
			prevInitialDateRef.current = initialSelectedDateKey;
			setSelectedDateKey(initialSelectedDateKey);
		}
		setLogsByDate((prev) => {
			const next = { ...prev };
			for (const day of days) {
				if (
					day.log &&
					!dirtyDatesRef.current.has(day.dateKey) &&
					!inFlightDatesRef.current.has(day.dateKey)
				) {
					next[day.dateKey] = day.log;
				}
			}
			logsRef.current = next;
			return next;
		});
	}, [initialSelectedDateKey, days]);

	useEffect(() => {
		return () => {
			if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
		};
	}, []);

	async function persistDate(dateKey: string, snapshot: CalendarDayLogView) {
		const seq = (saveSeqRef.current[dateKey] ?? 0) + 1;
		saveSeqRef.current[dateKey] = seq;
		inFlightDatesRef.current.add(dateKey);
		dirtyDatesRef.current.delete(dateKey);

		try {
			const res = await saveDailyWellnessLogAction({
				date: dateKey,
				periodFlow: (snapshot.periodFlow as PeriodFlowOption | null) ?? null,
				painTags: snapshot.painTags as PainTagOption[],
				painSeverity: snapshot.painSeverity,
				painDetails: snapshot.painDetails as Record<
					PainTagOption,
					number
				> | null,
				crampSeverity: snapshot.crampSeverity,
				medications: snapshot.medications as MedicationOption[],
				supplements: snapshot.supplements,
				sleepTime: snapshot.sleepTime,
				wakeTime: snapshot.wakeTime,
				sleepQuality: snapshot.sleepQuality,
				energyLevel: snapshot.energyLevel,
				stressLevel: snapshot.stressLevel,
				moodTags: snapshot.moodTags as MoodTagOption[],
				hydrationMl: snapshot.hydrationMl,
				notes: snapshot.notes,
			});

			if (saveSeqRef.current[dateKey] !== seq) return;

			if (res.ok) {
				if (!dirtyDatesRef.current.has(dateKey)) {
					setLogsByDate((prev) => {
						const next = { ...prev, [dateKey]: res.log };
						logsRef.current = next;
						return next;
					});
				}
				setSaveStatus("saved");
				setLastErrorDate(null);
				if (res.cyclesReconciled) {
					router.refresh();
				}
			} else {
				dirtyDatesRef.current.add(dateKey);
				setSaveStatus("error");
				setLastErrorDate(dateKey);
				toast.error(t("saveError"));
			}
		} catch {
			if (saveSeqRef.current[dateKey] === seq) {
				dirtyDatesRef.current.add(dateKey);
				setSaveStatus("error");
				setLastErrorDate(dateKey);
			}
		} finally {
			if (saveSeqRef.current[dateKey] === seq) {
				inFlightDatesRef.current.delete(dateKey);
			}
		}
	}

	const activeDraft =
		logsByDate[selectedDateKey] ?? emptyLogForDate(selectedDateKey);

	function patchDraft(patch: Partial<CalendarDayLogView>) {
		const updated: CalendarDayLogView = {
			...(logsRef.current[selectedDateKey] ?? emptyLogForDate(selectedDateKey)),
			...patch,
		};
		logsRef.current = { ...logsRef.current, [selectedDateKey]: updated };
		setLogsByDate((prev) => ({
			...prev,
			[selectedDateKey]: updated,
		}));

		dirtyDatesRef.current.add(selectedDateKey);
		setSaveStatus("saving");
		setLastErrorDate(null);

		if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
		const targetDate = selectedDateKey;
		saveTimerRef.current = setTimeout(() => {
			void persistDate(targetDate, logsRef.current[targetDate] ?? updated);
		}, 650);
	}

	function handleSelectDate(nextDateKey: string) {
		if (nextDateKey === selectedDateKey) return;
		if (dirtyDatesRef.current.has(selectedDateKey)) {
			if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
			const snapshot =
				logsRef.current[selectedDateKey] ?? emptyLogForDate(selectedDateKey);
			void persistDate(selectedDateKey, snapshot);
		}
		setSelectedDateKey(nextDateKey);
	}

	function handleRetrySave() {
		const target = lastErrorDate ?? selectedDateKey;
		const snapshot = logsRef.current[target] ?? emptyLogForDate(target);
		setSaveStatus("saving");
		void persistDate(target, snapshot);
	}

	function updateVisibleCategories(next: WellnessCategoryKey[]) {
		setVisibleCategories(next);
		try {
			window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(next));
		} catch {
			// Ignore storage errors
		}
	}

	function handleToggleCategory(category: WellnessCategoryKey) {
		const exists = visibleCategories.includes(category);
		if (exists && visibleCategories.length <= 1) return;
		const next = exists
			? visibleCategories.filter((c) => c !== category)
			: [...visibleCategories, category];
		updateVisibleCategories(next);
	}

	function handleToggleIndicator(filter: CalendarIndicatorFilter) {
		setActiveIndicators((prev) =>
			prev.includes(filter)
				? prev.filter((item) => item !== filter)
				: [...prev, filter],
		);
	}

	async function handleAddCustomItem(
		kind: WellnessItemKindValue,
		name: string,
	): Promise<boolean> {
		setAddingItemKind(kind);
		try {
			const res = await createCustomWellnessItemAction({ kind, name });
			if (res.ok) {
				setCustomItems((prev) => {
					const filtered = prev.filter((item) => item.id !== res.item.id);
					return [...filtered, res.item];
				});
				const field = kind === "SUPPLEMENT" ? "supplements" : "medications";
				const currentList = activeDraft[field];
				if (!currentList.includes(res.item.slug)) {
					patchDraft({ [field]: [...currentList, res.item.slug] });
				}
				toast.success(t("customItemAddedToast", { name: res.item.name }));
				return true;
			}
			toast.error(t("saveError"));
			return false;
		} catch {
			toast.error(t("saveError"));
			return false;
		} finally {
			setAddingItemKind(null);
		}
	}

	function handleArchiveCustomItem(itemId: string) {
		const removed = customItems.find((i) => i.id === itemId);
		setCustomItems((prev) => prev.filter((i) => i.id !== itemId));
		void archiveCustomWellnessItemAction(itemId).then((res) => {
			if (!res.ok && removed) {
				setCustomItems((prev) => [...prev, removed]);
				toast.error(t("saveError"));
			}
		});
	}

	const selectedDaySummary = useMemo(
		() => days.find((d) => d.dateKey === selectedDateKey) ?? days[0],
		[days, selectedDateKey],
	);

	const weekStripDays = useMemo(() => {
		const idx = days.findIndex((d) => d.dateKey === selectedDateKey);
		const safeIdx = idx === -1 ? 0 : idx;
		const weekStart = safeIdx - (safeIdx % 7);
		return days.slice(weekStart, weekStart + 7);
	}, [days, selectedDateKey]);

	return (
		<div className="flex flex-col gap-4">
			<div className="sticky top-0 z-20 -mx-4 bg-background/95 px-4 py-1 backdrop-blur-sm">
				<Frame spacing="sm">
					<FrameHeader>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div className="min-w-0">
								<FrameTitle>
									{t("selectedDateLabel", { date: selectedDateKey })}
								</FrameTitle>
							</div>
							<div className="flex items-center gap-1">
								{saveStatus === "saving" && (
									<Badge variant="secondary" size="xs">
										<Loader2 className="animate-spin" />
										{t("statusSaving")}
									</Badge>
								)}
								{saveStatus === "saved" && (
									<Badge variant="success-light" size="xs">
										<Check />
										{t("statusSaved")}
									</Badge>
								)}
								{saveStatus === "error" && (
									<Button
										type="button"
										size="xs"
										variant="destructive"
										onClick={handleRetrySave}
									>
										<AlertCircle className="size-3" />
										{t("statusRetry")}
									</Button>
								)}
								{tracksPeriod && (
									<Button
										type="button"
										size="icon-xs"
										variant="outline"
										aria-label={t("cycleHistoryButtonAria")}
										onClick={() => setCycleHistoryOpen(true)}
									>
										<History />
									</Button>
								)}
								<Button
									type="button"
									size="icon-xs"
									variant="outline"
									aria-label={t("filterButtonAria")}
									onClick={() => setFilterOpen(true)}
								>
									<SlidersHorizontal />
								</Button>
							</div>
						</div>

						<div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
							<div className="flex flex-wrap items-center gap-1.5">
								{selectedDaySummary?.hasWorkout ? (
									<Badge variant="success-light" size="sm">
										{t("workoutDoneBadge")}
									</Badge>
								) : selectedDaySummary?.isScheduledTraining ? (
									<Badge variant="secondary" size="sm">
										{t("scheduledDayBadge")}
									</Badge>
								) : (
									<Badge variant="outline" size="sm">
										{t("restDayBadge")}
									</Badge>
								)}

								{selectedDaySummary?.cyclePhase && (
									<Badge variant="info-light" size="sm">
										{t("cycleDayBadge", {
											day: selectedDaySummary.cyclePhase.dayInCycle,
											phase: t(
												`cyclePhases.${selectedDaySummary.cyclePhase.phase}`,
											),
										})}
										{cycleRegularity === "IRREGULAR" &&
											` · ${t("cycleApproxTag")}`}
									</Badge>
								)}
							</div>

							<Button
								type="button"
								size="xs"
								variant="ghost"
								onClick={() => setShowMonthGrid((v) => !v)}
							>
								<Calendar className="size-3.5" />
								<span>{monthLabel}</span>
								{showMonthGrid ? (
									<ChevronUp className="size-3.5" />
								) : (
									<ChevronDown className="size-3.5" />
								)}
							</Button>
						</div>

						<div className="grid grid-cols-7 gap-1 pt-1">
							{weekStripDays.map((day) => {
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
									layout: "strip",
								});

								return (
									<Button
										key={`strip-${day.dateKey}`}
										type="button"
										size="xs"
										variant={appearance.variant}
										className={appearance.className}
										aria-pressed={state.isSelected}
										onClick={() => handleSelectDate(day.dateKey)}
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
											layout="strip"
										/>
									</Button>
								);
							})}
						</div>
					</FrameHeader>
				</Frame>
			</div>

			{showMonthGrid && (
				<MonthlyCalendarPanel
					monthLabel={monthLabel}
					prevMonthKey={prevMonthKey}
					nextMonthKey={nextMonthKey}
					selectedDateKey={selectedDateKey}
					tracksPeriod={tracksPeriod}
					days={days}
					logsByDate={logsByDate}
					monthlyInsights={monthlyInsights}
					activeIndicators={activeIndicators}
					onToggleIndicator={handleToggleIndicator}
					onSelectDate={handleSelectDate}
				/>
			)}

			{selectedDaySummary?.workoutSummary && (
				<DayWorkoutRecapCard
					summary={selectedDaySummary.workoutSummary}
					isToday={selectedDaySummary.isToday}
				/>
			)}

			<InputGroup>
				<InputGroupAddon>
					<Search />
				</InputGroupAddon>
				<InputGroupInput
					id="calendar-wellness-search"
					name="calendarSearch"
					aria-label={t("searchPlaceholder")}
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder={t("searchPlaceholder")}
				/>
			</InputGroup>

			<WellnessCategoryCards
				activeDraft={activeDraft}
				patchDraft={patchDraft}
				tracksPeriod={tracksPeriod}
				visibleCategories={visibleCategories}
				searchQuery={searchQuery}
				customItems={customItems}
				addingItemKind={addingItemKind}
				onAddCustomItem={handleAddCustomItem}
				onArchiveCustomItem={handleArchiveCustomItem}
				onOpenLearnMore={setLearnMoreTopic}
			/>

			<CategoryFilterSheet
				open={filterOpen}
				onOpenChange={setFilterOpen}
				tracksPeriod={tracksPeriod}
				visibleCategories={visibleCategories}
				onToggleCategory={handleToggleCategory}
				onResetAll={() => updateVisibleCategories([...ALL_WELLNESS_CATEGORIES])}
			/>

			<LearnMoreSheet
				topic={learnMoreTopic}
				onClose={() => setLearnMoreTopic(null)}
			/>

			{tracksPeriod && (
				<CycleHistorySheet
					open={cycleHistoryOpen}
					onOpenChange={setCycleHistoryOpen}
					cycles={cycles}
					selectedDateKey={selectedDateKey}
				/>
			)}
		</div>
	);
}
