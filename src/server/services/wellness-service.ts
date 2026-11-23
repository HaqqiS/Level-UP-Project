import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { evaluateStreakHistory } from "@/lib/gamification/engine";
import {
	CustomWellnessItemInputSchema,
	type CycleConfidence,
	type CycleRegularityValue,
	CycleSettingsInputSchema,
	computeDetailedCyclePhaseForDate,
	computeNextPeriodPrediction,
	computeRollingCycleAverages,
	computeSleepDurationMinutes,
	DailyWellnessLogInputSchema,
	type LutealCyclePhaseInfo,
	MEDICATION_OPTIONS,
	MenstrualCycleManualInputSchema,
	normalizePainTags,
	parsePainDetailsRecord,
	reconcilePeriodEpisodes,
	SUPPLEMENT_OPTIONS,
	sanitizePainDetails,
	slugifyWellnessItemName,
} from "@/lib/wellness/cycle-and-wellness";
import { diffDaysUtc } from "@/lib/wellness/cycle-engine";
import { getLocalDateKey } from "@/server/services/weekly-plan-service";

export type CalendarDayLogView = {
	date: string;
	periodFlow: string | null;
	painTags: string[];
	painSeverity: number | null;
	painDetails: Record<string, number> | null;
	crampSeverity: number | null;
	medications: string[];
	supplements: string[];
	sleepTime: string | null;
	wakeTime: string | null;
	sleepDurationMinutes: number | null;
	sleepQuality: number | null;
	energyLevel: number | null;
	stressLevel: number | null;
	moodTags: string[];
	hydrationMl: number | null;
	notes: string | null;
};

export type CalendarWorkoutSummary = {
	focus: string | null;
	setsCount: number;
	durationSeconds: number | null;
	completed: boolean;
};

export type CalendarDaySummary = {
	dateKey: string;
	dayOfMonth: number;
	dayOfWeek: number;
	inCurrentMonth: boolean;
	isToday: boolean;
	hasWorkout: boolean;
	isScheduledTraining: boolean;
	isStreakFrozen: boolean;
	hasWellnessLog: boolean;
	workoutSummary: CalendarWorkoutSummary | null;
	cyclePhase: LutealCyclePhaseInfo | null;
	log: CalendarDayLogView | null;
};

export type CustomWellnessItemView = {
	id: string;
	kind: "SUPPLEMENT" | "MEDICATION";
	name: string;
	slug: string;
};

export type MenstrualCycleView = {
	id: string;
	startDate: string;
	endDate: string | null;
	cycleLengthDays: number | null;
	periodLengthDays: number | null;
	isConfirmed: boolean;
	notes: string | null;
};

export type MonthlyWellnessInsights = {
	avgSleepMinutes: number | null;
	sleepLoggedDays: number;
	workoutsCompletedCount: number;
	topPainTags: { tag: string; count: number }[];
	nextPredictedPeriodDate: string | null;
	daysUntilNextPeriod: number | null;
	predictionConfidence: CycleConfidence | null;
	predictionWindowDays: number | null;
};

function addDaysKey(dateKey: string, days: number): string {
	const d = new Date(`${dateKey}T00:00:00.000Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}

function buildMonthGridKeys(monthKey: string): string[] {
	const firstDayKey = `${monthKey}-01`;
	const firstDate = new Date(`${firstDayKey}T00:00:00.000Z`);
	const startOffset = firstDate.getUTCDay(); // 0=Sun..6=Sat
	const gridStartKey = addDaysKey(firstDayKey, -startOffset);

	const nextMonthStart = new Date(
		Date.UTC(firstDate.getUTCFullYear(), firstDate.getUTCMonth() + 1, 1),
	);
	const lastDayOfMonth = new Date(nextMonthStart.getTime() - 86_400_000);
	const endOffset = 6 - lastDayOfMonth.getUTCDay();
	const totalDays =
		Math.round(
			(lastDayOfMonth.getTime() -
				new Date(`${gridStartKey}T00:00:00.000Z`).getTime()) /
				86_400_000,
		) +
		1 +
		endOffset;

	const keys: string[] = [];
	for (let i = 0; i < totalDays; i++) {
		keys.push(addDaysKey(gridStartKey, i));
	}
	return keys;
}

function shiftMonthKey(monthKey: string, delta: number): string {
	const [yearStr, monthStr] = monthKey.split("-");
	const d = new Date(
		Date.UTC(Number(yearStr), Number(monthStr) - 1 + delta, 1),
	);
	return d.toISOString().slice(0, 7);
}

function hasAnyWellnessEntry(log: CalendarDayLogView): boolean {
	return Boolean(
		log.periodFlow ||
			log.painTags.length > 0 ||
			log.medications.length > 0 ||
			log.supplements.length > 0 ||
			log.sleepTime ||
			log.wakeTime ||
			log.sleepQuality ||
			log.energyLevel ||
			log.stressLevel ||
			log.moodTags.length > 0 ||
			(log.hydrationMl !== null && log.hydrationMl > 0) ||
			log.notes,
	);
}

function sanitizeWellnessItemSlugs(
	inputSlugs: readonly string[],
	presetSlugs: readonly string[],
	customSlugs: ReadonlySet<string>,
	existingStoredSlugs: readonly string[] = [],
): string[] {
	const allowed = new Set<string>([
		...presetSlugs,
		...customSlugs,
		...existingStoredSlugs,
	]);
	return [...new Set(inputSlugs)].filter((slug) => allowed.has(slug));
}

async function recomputeCycleLengthsAndProfileAverages(
	tx: Prisma.TransactionClient,
	userId: string,
	fallbackCycleDays: number,
	fallbackPeriodDays: number,
	options: {
		clearLastDateWhenEmpty?: boolean;
		preserveProfileAverages?: boolean;
		todayDateKey?: string;
	} = {},
) {
	const allCycles = await tx.menstrualCycle.findMany({
		where: { userId },
		orderBy: { startDate: "asc" },
	});

	for (let i = 0; i < allCycles.length; i++) {
		const current = allCycles[i];
		const next = allCycles[i + 1];
		let nextCycleLength: number | null = null;
		if (next) {
			const span = diffDaysUtc(current.startDate, next.startDate);
			nextCycleLength = span >= 15 && span <= 90 ? span : null;
		}
		if (current.cycleLengthDays !== nextCycleLength) {
			await tx.menstrualCycle.update({
				where: { id: current.id },
				data: { cycleLengthDays: nextCycleLength },
			});
			current.cycleLengthDays = nextCycleLength;
		}
	}

	if (options.preserveProfileAverages) {
		return;
	}

	const averages = computeRollingCycleAverages(
		allCycles,
		fallbackCycleDays,
		fallbackPeriodDays,
		options.todayDateKey,
	);
	const latest = allCycles[allCycles.length - 1] ?? null;

	await tx.profile.update({
		where: { userId },
		data: {
			...(averages.confirmedCyclesCount >= 2
				? { averageCycleDays: averages.averageCycleDays }
				: {}),
			...(averages.confirmedPeriodsCount >= 2 ||
			averages.averagePeriodDays !== fallbackPeriodDays
				? { averagePeriodDays: averages.averagePeriodDays }
				: {}),
			...(latest
				? { lastPeriodStartDate: latest.startDate }
				: options.clearLastDateWhenEmpty
					? { lastPeriodStartDate: null }
					: {}),
		},
	});
}

async function reconcileUserMenstrualCycles(
	tx: Prisma.TransactionClient,
	userId: string,
	params: {
		fallbackCycleDays: number;
		fallbackPeriodDays: number;
		clearedFlowDate?: string;
		todayDateKey?: string;
	},
) {
	const [loggedPeriodRows, existingCycles] = await Promise.all([
		tx.dailyWellnessLog.findMany({
			where: { userId, periodFlow: { not: null } },
			orderBy: { date: "asc" },
			select: { date: true },
		}),
		tx.menstrualCycle.findMany({
			where: { userId },
			orderBy: { startDate: "asc" },
		}),
	]);

	const loggedDates = loggedPeriodRows.map((r) => r.date);
	const derived = reconcilePeriodEpisodes(loggedDates);
	const consumedIds = new Set<string>();

	for (const ep of derived) {
		const exactMatch = existingCycles.find(
			(ex) => ex.startDate === ep.startDate,
		);
		const overlapping = existingCycles.filter((ex) => {
			const exEnd = ex.endDate ?? ex.startDate;
			return ex.startDate <= ep.endDate && exEnd >= ep.startDate;
		});

		const inheritedNotes =
			exactMatch?.notes ?? overlapping.find((o) => o.notes)?.notes ?? null;

		for (const dup of overlapping) {
			if (dup.startDate !== ep.startDate) {
				consumedIds.add(dup.id);
				await tx.menstrualCycle.delete({ where: { id: dup.id } });
			}
		}

		await tx.menstrualCycle.upsert({
			where: { userId_startDate: { userId, startDate: ep.startDate } },
			create: {
				userId,
				startDate: ep.startDate,
				endDate: ep.endDate,
				periodLengthDays: ep.periodLengthDays,
				cycleLengthDays: ep.cycleLengthDays,
				isConfirmed: true,
				notes: inheritedNotes,
			},
			update: {
				endDate: ep.endDate,
				periodLengthDays: ep.periodLengthDays,
				isConfirmed: true,
				notes: inheritedNotes,
			},
		});
	}

	if (params.clearedFlowDate) {
		const clearedDate = params.clearedFlowDate;
		const loggedSet = new Set(loggedDates);
		for (const ex of existingCycles) {
			if (consumedIds.has(ex.id)) continue;
			if (ex.notes || ex.endDate === null) continue;
			if (clearedDate < ex.startDate || clearedDate > ex.endDate) continue;

			const hasAnyRemainingLoggedDay = loggedDates.some(
				(d) => d >= ex.startDate && d <= (ex.endDate ?? ex.startDate),
			);
			const isCoveredByDerived = derived.some(
				(ep) => ep.startDate === ex.startDate,
			);
			if (
				!hasAnyRemainingLoggedDay &&
				!isCoveredByDerived &&
				!loggedSet.has(clearedDate)
			) {
				await tx.menstrualCycle.deleteMany({ where: { id: ex.id } });
			}
		}
	}

	await recomputeCycleLengthsAndProfileAverages(
		tx,
		userId,
		params.fallbackCycleDays,
		params.fallbackPeriodDays,
		{
			clearLastDateWhenEmpty: false,
			todayDateKey: params.todayDateKey,
		},
	);
}

export async function getCalendarWellnessData(
	userId: string,
	options?: { month?: string; date?: string },
) {
	const profile = await db.profile.findUnique({
		where: { userId },
		select: {
			sex: true,
			timezone: true,
			trainingDays: true,
			tracksPeriod: true,
			lastPeriodStartDate: true,
			averageCycleDays: true,
			averagePeriodDays: true,
			cycleRegularity: true,
			lutealPhaseDays: true,
			periodReminderEnabled: true,
			onboardingCompletedAt: true,
		},
	});
	if (!profile) throw new Error("Profile missing");

	const todayKey = getLocalDateKey(profile.timezone);
	const selectedDateKey =
		options?.date && /^\d{4}-\d{2}-\d{2}$/.test(options.date)
			? options.date
			: todayKey;
	const monthKey =
		options?.month && /^\d{4}-\d{2}$/.test(options.month)
			? options.month
			: selectedDateKey.slice(0, 7);

	const gridKeys = buildMonthGridKeys(monthKey);
	const gridStartKey = gridKeys[0];
	const gridEndKey = gridKeys[gridKeys.length - 1];

	const [allCompletedLogs, gridWorkoutLogs, wellnessLogs, customItems, cycles] =
		await Promise.all([
			db.workoutLog.findMany({
				where: { userId, completedAt: { not: null } },
				select: { date: true },
			}),
			db.workoutLog.findMany({
				where: {
					userId,
					date: { gte: gridStartKey, lte: gridEndKey },
				},
				select: {
					date: true,
					completedAt: true,
					durationSeconds: true,
					plannedSession: { select: { focus: true } },
					_count: { select: { sets: true } },
				},
			}),
			db.dailyWellnessLog.findMany({
				where: {
					userId,
					date: { gte: gridStartKey, lte: gridEndKey },
				},
			}),
			db.userWellnessItem.findMany({
				where: { userId, isActive: true },
				orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
				select: { id: true, kind: true, name: true, slug: true },
			}),
			profile.tracksPeriod
				? db.menstrualCycle.findMany({
						where: { userId },
						orderBy: { startDate: "desc" },
						take: 12,
						select: {
							id: true,
							startDate: true,
							endDate: true,
							cycleLengthDays: true,
							periodLengthDays: true,
							isConfirmed: true,
							notes: true,
						},
					})
				: Promise.resolve([]),
		]);

	const startDateKey = profile.onboardingCompletedAt
		? getLocalDateKey(profile.timezone, profile.onboardingCompletedAt)
		: todayKey;
	const streakEval = evaluateStreakHistory({
		scheduledDays: profile.trainingDays,
		completedDates: allCompletedLogs.map((l) => l.date),
		startDateKey,
		todayDateKey: todayKey,
	});
	const frozenSet = new Set(streakEval.frozenDates);

	const completedSet = new Set(
		gridWorkoutLogs.filter((l) => l.completedAt !== null).map((l) => l.date),
	);
	const workoutSummaryByDate = new Map<string, CalendarWorkoutSummary>(
		gridWorkoutLogs
			.filter((l) => l.completedAt !== null || l._count.sets > 0)
			.map((l) => [
				l.date,
				{
					focus: l.plannedSession?.focus ?? null,
					setsCount: l._count.sets,
					durationSeconds: l.durationSeconds,
					completed: l.completedAt !== null,
				},
			]),
	);

	const trainingSet = new Set(profile.trainingDays);
	const wellnessByDate = new Map<string, CalendarDayLogView>(
		wellnessLogs.map((row) => [
			row.date,
			{
				date: row.date,
				periodFlow: row.periodFlow,
				painTags: row.painTags,
				painSeverity: row.painSeverity,
				painDetails: parsePainDetailsRecord(row.painDetails),
				crampSeverity: row.crampSeverity,
				medications: row.medications,
				supplements: row.supplements,
				sleepTime: row.sleepTime,
				wakeTime: row.wakeTime,
				sleepDurationMinutes: row.sleepDurationMinutes,
				sleepQuality: row.sleepQuality,
				energyLevel: row.energyLevel,
				stressLevel: row.stressLevel,
				moodTags: row.moodTags,
				hydrationMl: row.hydrationMl,
				notes: row.notes,
			},
		]),
	);

	const days: CalendarDaySummary[] = gridKeys.map((dateKey) => {
		const dateObj = new Date(`${dateKey}T00:00:00.000Z`);
		const dayOfWeek = dateObj.getUTCDay();
		const log = wellnessByDate.get(dateKey) ?? null;

		return {
			dateKey,
			dayOfMonth: dateObj.getUTCDate(),
			dayOfWeek,
			inCurrentMonth: dateKey.startsWith(monthKey),
			isToday: dateKey === todayKey,
			hasWorkout: completedSet.has(dateKey),
			isScheduledTraining: trainingSet.has(dayOfWeek),
			isStreakFrozen: frozenSet.has(dateKey),
			hasWellnessLog: log ? hasAnyWellnessEntry(log) : false,
			workoutSummary: workoutSummaryByDate.get(dateKey) ?? null,
			cyclePhase: computeDetailedCyclePhaseForDate({
				tracksPeriod: profile.tracksPeriod,
				lastPeriodStartDate: profile.lastPeriodStartDate,
				averageCycleDays: profile.averageCycleDays,
				averagePeriodDays: profile.averagePeriodDays,
				lutealPhaseDays: profile.lutealPhaseDays,
				cycleRegularity: profile.cycleRegularity,
				cycles,
				targetDateKey: dateKey,
				todayDateKey: todayKey,
				hasLoggedPeriodFlowOnDate: Boolean(log?.periodFlow),
			}),
			log,
		};
	});

	const monthDays = days.filter((d) => d.inCurrentMonth);
	const sleepDurations = monthDays
		.map((d) => d.log?.sleepDurationMinutes)
		.filter((v): v is number => typeof v === "number" && v > 0);
	const avgSleepMinutes =
		sleepDurations.length > 0
			? Math.round(
					sleepDurations.reduce((a, b) => a + b, 0) / sleepDurations.length,
				)
			: null;

	const painCounter = new Map<string, number>();
	for (const d of monthDays) {
		for (const tag of d.log?.painTags ?? []) {
			if (tag !== "pain_free") {
				painCounter.set(tag, (painCounter.get(tag) ?? 0) + 1);
			}
		}
	}
	const topPainTags = [...painCounter.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 3)
		.map(([tag, count]) => ({ tag, count }));

	const nextPrediction = profile.tracksPeriod
		? computeNextPeriodPrediction({
				tracksPeriod: true,
				lastPeriodStartDate: profile.lastPeriodStartDate,
				averageCycleDays: profile.averageCycleDays,
				averagePeriodDays: profile.averagePeriodDays,
				cycleRegularity: profile.cycleRegularity,
				cycles,
				todayDateKey: todayKey,
			})
		: null;

	const monthlyInsights: MonthlyWellnessInsights = {
		avgSleepMinutes,
		sleepLoggedDays: sleepDurations.length,
		workoutsCompletedCount: monthDays.filter((d) => d.hasWorkout).length,
		topPainTags,
		nextPredictedPeriodDate: nextPrediction?.nextPredictedStartDate ?? null,
		daysUntilNextPeriod: nextPrediction?.daysUntilNextPeriod ?? null,
		predictionConfidence: nextPrediction?.confidence ?? null,
		predictionWindowDays: nextPrediction?.predictionWindowDays ?? null,
	};

	const monthDate = new Date(`${monthKey}-01T00:00:00.000Z`);
	const monthLabel = new Intl.DateTimeFormat("en-US", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	}).format(monthDate);

	return {
		todayKey,
		monthKey,
		monthLabel,
		prevMonthKey: shiftMonthKey(monthKey, -1),
		nextMonthKey: shiftMonthKey(monthKey, 1),
		selectedDateKey,
		tracksPeriod: profile.tracksPeriod,
		cycleSettings: {
			sex: profile.sex,
			tracksPeriod: profile.tracksPeriod,
			cycleRegularity: profile.cycleRegularity as CycleRegularityValue,
			averageCycleDays: profile.averageCycleDays,
			averagePeriodDays: profile.averagePeriodDays,
			lutealPhaseDays: profile.lutealPhaseDays,
			periodReminderEnabled: profile.periodReminderEnabled,
		},
		customItems: customItems satisfies CustomWellnessItemView[],
		cycles: cycles satisfies MenstrualCycleView[],
		monthlyInsights,
		days,
	};
}

export async function saveDailyWellnessLogForUser(
	userId: string,
	rawInput: unknown,
) {
	const parsed = DailyWellnessLogInputSchema.safeParse(rawInput);
	if (!parsed.success) {
		return { ok: false as const, reason: "invalid" as const };
	}

	const [profile, userItems, existingLog] = await Promise.all([
		db.profile.findUnique({
			where: { userId },
			select: {
				timezone: true,
				tracksPeriod: true,
				averageCycleDays: true,
				averagePeriodDays: true,
			},
		}),
		db.userWellnessItem.findMany({
			where: { userId, isActive: true },
			select: { kind: true, slug: true },
		}),
		db.dailyWellnessLog.findUnique({
			where: { userId_date: { userId, date: parsed.data.date } },
			select: {
				periodFlow: true,
				supplements: true,
				medications: true,
			},
		}),
	]);

	if (!profile) {
		return { ok: false as const, reason: "not_found" as const };
	}

	const d = parsed.data;
	const periodFlow = profile.tracksPeriod ? (d.periodFlow ?? null) : null;
	const painTags = normalizePainTags(d.painTags, profile.tracksPeriod);
	const hasActivePain = painTags.some((tag) => tag !== "pain_free");

	const painSeverity = hasActivePain ? (d.painSeverity ?? null) : null;
	const painDetails = hasActivePain
		? sanitizePainDetails(d.painDetails, painTags, profile.tracksPeriod)
		: null;
	const crampSeverity =
		profile.tracksPeriod && (periodFlow !== null || painTags.includes("cramps"))
			? (d.crampSeverity ?? null)
			: null;

	const customSuppSlugs = new Set(
		userItems.filter((i) => i.kind === "SUPPLEMENT").map((i) => i.slug),
	);
	const customMedSlugs = new Set(
		userItems.filter((i) => i.kind === "MEDICATION").map((i) => i.slug),
	);

	const supplements = sanitizeWellnessItemSlugs(
		d.supplements,
		SUPPLEMENT_OPTIONS,
		customSuppSlugs,
		existingLog?.supplements ?? [],
	);
	const medications = sanitizeWellnessItemSlugs(
		d.medications,
		MEDICATION_OPTIONS,
		customMedSlugs,
		existingLog?.medications ?? [],
	);

	const sleepTime = d.sleepTime || null;
	const wakeTime = d.wakeTime || null;
	const sleepDurationMinutes = computeSleepDurationMinutes(sleepTime, wakeTime);
	const sleepQuality = d.sleepQuality ?? null;
	const energyLevel = d.energyLevel ?? null;
	const stressLevel = d.stressLevel ?? null;
	const moodTags = [...new Set(d.moodTags)];
	const hydrationMl =
		typeof d.hydrationMl === "number" ? Math.max(0, d.hydrationMl) : null;
	const notes = d.notes?.trim() ? d.notes.trim() : null;

	const prevPeriodFlow = existingLog?.periodFlow ?? null;
	const periodFlowChanged = prevPeriodFlow !== periodFlow;

	const saved = await db.$transaction(async (tx) => {
		const row = await tx.dailyWellnessLog.upsert({
			where: { userId_date: { userId, date: d.date } },
			create: {
				userId,
				date: d.date,
				periodFlow,
				painTags,
				painSeverity,
				painDetails: painDetails
					? (painDetails as Prisma.InputJsonValue)
					: Prisma.DbNull,
				crampSeverity,
				medications,
				supplements,
				sleepTime,
				wakeTime,
				sleepDurationMinutes,
				sleepQuality,
				energyLevel,
				stressLevel,
				moodTags,
				hydrationMl,
				notes,
			},
			update: {
				periodFlow,
				painTags,
				painSeverity,
				painDetails: painDetails
					? (painDetails as Prisma.InputJsonValue)
					: Prisma.DbNull,
				crampSeverity,
				medications,
				supplements,
				sleepTime,
				wakeTime,
				sleepDurationMinutes,
				sleepQuality,
				energyLevel,
				stressLevel,
				moodTags,
				hydrationMl,
				notes,
			},
		});

		if (profile.tracksPeriod && periodFlowChanged) {
			await reconcileUserMenstrualCycles(tx, userId, {
				fallbackCycleDays: profile.averageCycleDays,
				fallbackPeriodDays: profile.averagePeriodDays,
				clearedFlowDate:
					prevPeriodFlow !== null && periodFlow === null ? d.date : undefined,
				todayDateKey: getLocalDateKey(profile.timezone),
			});
		}

		return row;
	});

	return {
		ok: true as const,
		cyclesReconciled: profile.tracksPeriod && periodFlowChanged,
		log: {
			date: saved.date,
			periodFlow: saved.periodFlow,
			painTags: saved.painTags,
			painSeverity: saved.painSeverity,
			painDetails: parsePainDetailsRecord(saved.painDetails),
			crampSeverity: saved.crampSeverity,
			medications: saved.medications,
			supplements: saved.supplements,
			sleepTime: saved.sleepTime,
			wakeTime: saved.wakeTime,
			sleepDurationMinutes: saved.sleepDurationMinutes,
			sleepQuality: saved.sleepQuality,
			energyLevel: saved.energyLevel,
			stressLevel: saved.stressLevel,
			moodTags: saved.moodTags,
			hydrationMl: saved.hydrationMl,
			notes: saved.notes,
		} satisfies CalendarDayLogView,
	};
}

export async function updateCycleSettingsForUser(
	userId: string,
	rawInput: unknown,
) {
	const parsed = CycleSettingsInputSchema.safeParse(rawInput);
	if (!parsed.success) {
		return { ok: false as const, reason: "invalid" as const };
	}

	const profile = await db.profile.findUnique({
		where: { userId },
		select: { sex: true, timezone: true },
	});
	if (!profile) {
		return { ok: false as const, reason: "not_found" as const };
	}

	const d = parsed.data;
	const allowPeriod = profile.sex === "female" && d.tracksPeriod;
	const cleanStartDate = allowPeriod ? (d.lastPeriodStartDate ?? null) : null;
	const todayKey = getLocalDateKey(profile.timezone);

	await db.$transaction(async (tx) => {
		await tx.profile.update({
			where: { userId },
			data: {
				tracksPeriod: allowPeriod,
				lastPeriodStartDate: cleanStartDate,
				averageCycleDays: d.averageCycleDays,
				averagePeriodDays: d.averagePeriodDays,
				cycleRegularity: allowPeriod ? d.cycleRegularity : "UNKNOWN",
				lutealPhaseDays: d.lutealPhaseDays,
				periodReminderEnabled: allowPeriod && d.periodReminderEnabled,
			},
		});

		if (allowPeriod && cleanStartDate) {
			const existingAtStart = await tx.menstrualCycle.findUnique({
				where: {
					userId_startDate: { userId, startDate: cleanStartDate },
				},
				select: { id: true, endDate: true },
			});
			if (!existingAtStart) {
				await tx.menstrualCycle.create({
					data: {
						userId,
						startDate: cleanStartDate,
						periodLengthDays: d.averagePeriodDays,
						isConfirmed: true,
					},
				});
			} else if (existingAtStart.endDate === null) {
				await tx.menstrualCycle.update({
					where: { id: existingAtStart.id },
					data: { periodLengthDays: d.averagePeriodDays },
				});
			}
			await recomputeCycleLengthsAndProfileAverages(
				tx,
				userId,
				d.averageCycleDays,
				d.averagePeriodDays,
				{ preserveProfileAverages: true, todayDateKey: todayKey },
			);
		}
	});

	return { ok: true as const };
}

export async function createUserWellnessItem(
	userId: string,
	rawInput: unknown,
) {
	const parsed = CustomWellnessItemInputSchema.safeParse(rawInput);
	if (!parsed.success) {
		return { ok: false as const, reason: "invalid" as const };
	}

	const slug = slugifyWellnessItemName(parsed.data.name);
	const saved = await db.userWellnessItem.upsert({
		where: {
			userId_kind_slug: {
				userId,
				kind: parsed.data.kind,
				slug,
			},
		},
		create: {
			userId,
			kind: parsed.data.kind,
			name: parsed.data.name,
			slug,
			isActive: true,
		},
		update: {
			name: parsed.data.name,
			isActive: true,
		},
		select: {
			id: true,
			kind: true,
			name: true,
			slug: true,
		},
	});

	return { ok: true as const, item: saved satisfies CustomWellnessItemView };
}

export async function archiveUserWellnessItem(userId: string, itemId: string) {
	if (!itemId.trim()) {
		return { ok: false as const, reason: "invalid" as const };
	}
	await db.userWellnessItem.updateMany({
		where: { id: itemId, userId },
		data: { isActive: false },
	});
	return { ok: true as const };
}

export async function upsertManualMenstrualCycle(
	userId: string,
	rawInput: unknown,
) {
	const parsed = MenstrualCycleManualInputSchema.safeParse(rawInput);
	if (!parsed.success) {
		return { ok: false as const, reason: "invalid" as const };
	}

	const profile = await db.profile.findUnique({
		where: { userId },
		select: {
			timezone: true,
			tracksPeriod: true,
			averageCycleDays: true,
			averagePeriodDays: true,
		},
	});
	if (!profile?.tracksPeriod) {
		return { ok: false as const, reason: "forbidden" as const };
	}

	const d = parsed.data;
	const periodLengthDays = d.endDate
		? diffDaysUtc(d.startDate, d.endDate) + 1
		: profile.averagePeriodDays;
	const notes = d.notes?.trim() ? d.notes.trim() : null;
	const todayKey = getLocalDateKey(profile.timezone);

	await db.$transaction(async (tx) => {
		if (d.id) {
			const existing = await tx.menstrualCycle.findFirst({
				where: { id: d.id, userId },
				select: { id: true, startDate: true },
			});
			if (existing && existing.startDate !== d.startDate) {
				await tx.menstrualCycle.delete({ where: { id: existing.id } });
			}
		}

		await tx.menstrualCycle.upsert({
			where: { userId_startDate: { userId, startDate: d.startDate } },
			create: {
				userId,
				startDate: d.startDate,
				endDate: d.endDate ?? null,
				periodLengthDays,
				isConfirmed: true,
				notes,
			},
			update: {
				endDate: d.endDate ?? null,
				periodLengthDays,
				isConfirmed: true,
				notes,
			},
		});

		await recomputeCycleLengthsAndProfileAverages(
			tx,
			userId,
			profile.averageCycleDays,
			profile.averagePeriodDays,
			{ clearLastDateWhenEmpty: false, todayDateKey: todayKey },
		);
	});

	return { ok: true as const };
}

export async function deleteManualMenstrualCycle(
	userId: string,
	cycleId: string,
) {
	if (!cycleId.trim()) {
		return { ok: false as const, reason: "invalid" as const };
	}

	const profile = await db.profile.findUnique({
		where: { userId },
		select: { timezone: true, averageCycleDays: true, averagePeriodDays: true },
	});
	if (!profile) {
		return { ok: false as const, reason: "not_found" as const };
	}
	const todayKey = getLocalDateKey(profile.timezone);

	await db.$transaction(async (tx) => {
		await tx.menstrualCycle.deleteMany({
			where: { id: cycleId, userId },
		});
		await recomputeCycleLengthsAndProfileAverages(
			tx,
			userId,
			profile.averageCycleDays,
			profile.averagePeriodDays,
			{ clearLastDateWhenEmpty: true, todayDateKey: todayKey },
		);
	});

	return { ok: true as const };
}
