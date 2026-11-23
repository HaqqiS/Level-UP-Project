export const CYCLE_REGULARITY_VALUES = [
	"REGULAR",
	"IRREGULAR",
	"UNKNOWN",
] as const;

export type CycleRegularityValue = (typeof CYCLE_REGULARITY_VALUES)[number];
export type CycleConfidence = "high" | "medium" | "low";
export type CyclePhase = "menstrual" | "follicular" | "ovulatory" | "luteal";

export type CycleEpisodeRecord = {
	id?: string;
	startDate: string;
	endDate?: string | null;
	cycleLengthDays?: number | null;
	periodLengthDays?: number | null;
	isConfirmed?: boolean;
	notes?: string | null;
};

export type ReconciledCycleEpisode = {
	startDate: string;
	endDate: string;
	periodLengthDays: number;
	cycleLengthDays: number | null;
};

export type LutealCyclePhaseInfo = {
	phase: CyclePhase;
	dayInCycle: number;
	isConfirmedPeriodDay: boolean;
	isPredictedPeriodDay: boolean;
	confidence: CycleConfidence;
	predictionWindowDays: number;
};

export type NextPeriodPrediction = {
	nextPredictedStartDate: string;
	daysUntilNextPeriod: number;
	confidence: CycleConfidence;
	predictionWindowDays: number;
	effectiveCycleDays: number;
	effectivePeriodDays: number;
};

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

export function clampNumber(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export function diffDaysUtc(fromKey: string, toKey: string): number {
	const fromMs = Date.parse(`${fromKey}T00:00:00.000Z`);
	const toMs = Date.parse(`${toKey}T00:00:00.000Z`);
	return Math.round((toMs - fromMs) / MS_PER_DAY);
}

export function addDaysUtcKey(dateKey: string, days: number): string {
	const date = new Date(`${dateKey}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

/**
 * Groups discrete daily period flow dates into confirmed MenstrualCycle episodes.
 * Merges consecutive days or single-day pauses (gap <= 1 blank day) up to 10 days max per episode.
 */
export function reconcilePeriodEpisodes(
	loggedPeriodDates: readonly string[],
): ReconciledCycleEpisode[] {
	const sorted = [
		...new Set(loggedPeriodDates.filter((d) => DATE_KEY_RE.test(d))),
	].sort();

	if (sorted.length === 0) return [];

	const rawEpisodes: { startDate: string; endDate: string }[] = [];
	let current = { startDate: sorted[0], endDate: sorted[0] };

	for (let i = 1; i < sorted.length; i++) {
		const date = sorted[i];
		const gapDays = diffDaysUtc(current.endDate, date);
		const candidateSpan = diffDaysUtc(current.startDate, date) + 1;

		if (gapDays <= 2 && candidateSpan <= 10) {
			current.endDate = date;
		} else {
			rawEpisodes.push(current);
			current = { startDate: date, endDate: date };
		}
	}
	rawEpisodes.push(current);

	const episodes: ReconciledCycleEpisode[] = rawEpisodes.map((ep) => ({
		startDate: ep.startDate,
		endDate: ep.endDate,
		periodLengthDays: diffDaysUtc(ep.startDate, ep.endDate) + 1,
		cycleLengthDays: null,
	}));

	for (let i = 0; i < episodes.length - 1; i++) {
		const cycleSpan = diffDaysUtc(
			episodes[i].startDate,
			episodes[i + 1].startDate,
		);
		episodes[i].cycleLengthDays =
			cycleSpan >= 15 && cycleSpan <= 90 ? cycleSpan : null;
	}

	return episodes;
}

export function computeRollingCycleAverages(
	episodes: readonly (Pick<
		CycleEpisodeRecord,
		"cycleLengthDays" | "periodLengthDays" | "isConfirmed" | "endDate"
	> & { startDate?: string })[],
	fallbackCycleDays = 28,
	fallbackPeriodDays = 5,
	referenceDateKey?: string,
): {
	averageCycleDays: number;
	averagePeriodDays: number;
	confirmedCyclesCount: number;
	confirmedPeriodsCount: number;
} {
	const safeFallbackCycle = clampNumber(Math.round(fallbackCycleDays), 20, 45);
	const safeFallbackPeriod = clampNumber(Math.round(fallbackPeriodDays), 2, 10);

	const confirmed = [...episodes]
		.filter((ep) => ep.isConfirmed !== false)
		.sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""));

	const isPotentiallyOngoing = (ep: {
		endDate?: string | null;
		cycleLengthDays?: number | null;
	}) => {
		if (!referenceDateKey || !ep.endDate) return false;
		if (typeof ep.cycleLengthDays === "number") return false;
		return diffDaysUtc(ep.endDate, referenceDateKey) <= 10;
	};

	const validCycles = confirmed
		.map((ep) => ep.cycleLengthDays)
		.filter((v): v is number => typeof v === "number" && v >= 20 && v <= 45)
		.slice(-6);

	const validPeriods = confirmed
		.filter((ep) => !isPotentiallyOngoing(ep))
		.map((ep) => ep.periodLengthDays)
		.filter((v): v is number => typeof v === "number" && v >= 2 && v <= 10)
		.slice(-6);

	const ongoingEpisodes = confirmed.filter((ep) => isPotentiallyOngoing(ep));
	const effectiveFallbackPeriod =
		validPeriods.length === 0 &&
		safeFallbackPeriod <= 3 &&
		ongoingEpisodes.some((ep) => ep.periodLengthDays === safeFallbackPeriod)
			? 5
			: safeFallbackPeriod;

	const averageCycleDays =
		validCycles.length > 0
			? clampNumber(
					Math.round(
						validCycles.reduce((sum, n) => sum + n, 0) / validCycles.length,
					),
					20,
					45,
				)
			: safeFallbackCycle;

	const averagePeriodDays =
		validPeriods.length > 0
			? clampNumber(
					Math.round(
						validPeriods.reduce((sum, n) => sum + n, 0) / validPeriods.length,
					),
					2,
					10,
				)
			: effectiveFallbackPeriod;

	return {
		averageCycleDays,
		averagePeriodDays,
		confirmedCyclesCount: validCycles.length,
		confirmedPeriodsCount: validPeriods.length,
	};
}

export function computeCycleConfidence(
	regularity: CycleRegularityValue = "UNKNOWN",
	confirmedCyclesCount = 0,
): { confidence: CycleConfidence; predictionWindowDays: number } {
	if (regularity === "IRREGULAR") {
		return { confidence: "low", predictionWindowDays: 3 };
	}
	if (regularity === "REGULAR" && confirmedCyclesCount >= 2) {
		return { confidence: "high", predictionWindowDays: 1 };
	}
	return { confidence: "medium", predictionWindowDays: 2 };
}

function phaseFromCycleDay(params: {
	dayInCycle: number;
	cycleLen: number;
	periodLen: number;
	lutealLen: number;
}): {
	phase: CyclePhase;
	ovulationDay: number;
} {
	const { dayInCycle, cycleLen, periodLen, lutealLen } = params;
	const ovulationDay = Math.max(
		periodLen + 2,
		Math.min(cycleLen - 3, cycleLen - lutealLen),
	);

	let phase: CyclePhase;
	if (dayInCycle <= periodLen) {
		phase = "menstrual";
	} else if (dayInCycle <= Math.max(periodLen + 1, ovulationDay - 2)) {
		phase = "follicular";
	} else if (dayInCycle <= ovulationDay + 1) {
		phase = "ovulatory";
	} else {
		phase = "luteal";
	}

	return { phase, ovulationDay };
}

function isDateInsideConfirmedCycle(
	targetDateKey: string,
	cycles: readonly CycleEpisodeRecord[],
): boolean {
	for (const ep of cycles) {
		if (ep.isConfirmed === false) continue;
		const effectiveEnd = ep.endDate ?? ep.startDate;
		if (targetDateKey >= ep.startDate && targetDateKey <= effectiveEnd) {
			return true;
		}
	}
	return false;
}

export function computeLutealAnchoredPhase(params: {
	tracksPeriod: boolean;
	lastPeriodStartDate?: string | null;
	averageCycleDays?: number;
	averagePeriodDays?: number;
	lutealPhaseDays?: number;
	cycleRegularity?: CycleRegularityValue;
	cycles?: readonly CycleEpisodeRecord[];
	targetDateKey: string;
	todayDateKey?: string;
	hasLoggedPeriodFlowOnDate?: boolean;
}): LutealCyclePhaseInfo | null {
	if (!params.tracksPeriod || !DATE_KEY_RE.test(params.targetDateKey)) {
		return null;
	}

	const sortedCycles = [...(params.cycles ?? [])]
		.filter((c) => DATE_KEY_RE.test(c.startDate))
		.sort((a, b) => a.startDate.localeCompare(b.startDate));

	const rolling = computeRollingCycleAverages(
		sortedCycles,
		params.averageCycleDays ?? 28,
		params.averagePeriodDays ?? 5,
		params.todayDateKey,
	);
	const cycleLen = rolling.averageCycleDays;
	const periodLen = rolling.averagePeriodDays;
	const lutealLen = clampNumber(
		Math.round(params.lutealPhaseDays ?? 14),
		10,
		17,
	);

	const { confidence, predictionWindowDays } = computeCycleConfidence(
		params.cycleRegularity ?? "UNKNOWN",
		rolling.confirmedCyclesCount,
	);

	const fallbackStart =
		params.lastPeriodStartDate && DATE_KEY_RE.test(params.lastPeriodStartDate)
			? params.lastPeriodStartDate
			: null;

	if (sortedCycles.length === 0 && !fallbackStart) {
		return null;
	}

	const isConfirmedPeriodDay =
		Boolean(params.hasLoggedPeriodFlowOnDate) ||
		isDateInsideConfirmedCycle(params.targetDateKey, sortedCycles);

	// Locate enclosing recorded cycle episode when present
	let activeEpisodeIndex = -1;
	for (let i = 0; i < sortedCycles.length; i++) {
		if (sortedCycles[i].startDate <= params.targetDateKey) {
			activeEpisodeIndex = i;
		} else {
			break;
		}
	}

	let anchorStart = fallbackStart ?? sortedCycles[0].startDate;
	let effectiveCycleSpan = cycleLen;
	let hasNextRecordedCycle = false;

	if (activeEpisodeIndex >= 0) {
		const activeEp = sortedCycles[activeEpisodeIndex];
		const nextEp = sortedCycles[activeEpisodeIndex + 1];
		if (
			!fallbackStart ||
			activeEp.startDate >= fallbackStart ||
			activeEpisodeIndex < sortedCycles.length - 1
		) {
			anchorStart = activeEp.startDate;
			if (nextEp) {
				const observedSpan = diffDaysUtc(activeEp.startDate, nextEp.startDate);
				if (observedSpan >= 15 && observedSpan <= 60) {
					effectiveCycleSpan = observedSpan;
					hasNextRecordedCycle = true;
				}
			}
		}
	} else if (sortedCycles.length > 0) {
		anchorStart =
			fallbackStart && fallbackStart < sortedCycles[0].startDate
				? fallbackStart
				: sortedCycles[0].startDate;
	}

	const diffDays = diffDaysUtc(anchorStart, params.targetDateKey);
	let dayInCycle: number;
	let isBeyondObservedCycle = false;

	if (hasNextRecordedCycle && diffDays >= 0 && diffDays < effectiveCycleSpan) {
		dayInCycle = diffDays + 1;
	} else if (diffDays >= 0 && diffDays < cycleLen) {
		dayInCycle = diffDays + 1;
	} else {
		const mod = ((diffDays % cycleLen) + cycleLen) % cycleLen;
		dayInCycle = mod + 1;
		isBeyondObservedCycle = diffDays >= cycleLen || diffDays < 0;
	}

	const phaseInfo = phaseFromCycleDay({
		dayInCycle,
		cycleLen: hasNextRecordedCycle ? effectiveCycleSpan : cycleLen,
		periodLen,
		lutealLen,
	});

	if (isConfirmedPeriodDay) {
		return {
			phase: "menstrual",
			dayInCycle,
			isConfirmedPeriodDay: true,
			isPredictedPeriodDay: false,
			confidence,
			predictionWindowDays,
		};
	}

	const isPredictedPeriodDay =
		(!hasNextRecordedCycle || isBeyondObservedCycle) && dayInCycle <= periodLen;

	return {
		phase: phaseInfo.phase,
		dayInCycle,
		isConfirmedPeriodDay: false,
		isPredictedPeriodDay,
		confidence,
		predictionWindowDays,
	};
}

export function computeNextPeriodPrediction(params: {
	tracksPeriod: boolean;
	lastPeriodStartDate?: string | null;
	averageCycleDays?: number;
	averagePeriodDays?: number;
	cycleRegularity?: CycleRegularityValue;
	cycles?: readonly CycleEpisodeRecord[];
	todayDateKey: string;
}): NextPeriodPrediction | null {
	if (!params.tracksPeriod || !DATE_KEY_RE.test(params.todayDateKey)) {
		return null;
	}

	const sortedCycles = [...(params.cycles ?? [])]
		.filter((c) => DATE_KEY_RE.test(c.startDate))
		.sort((a, b) => a.startDate.localeCompare(b.startDate));

	const latestCycleStart =
		sortedCycles[sortedCycles.length - 1]?.startDate ?? null;
	const profileStart =
		params.lastPeriodStartDate && DATE_KEY_RE.test(params.lastPeriodStartDate)
			? params.lastPeriodStartDate
			: null;

	const anchorStart =
		[latestCycleStart, profileStart]
			.filter((v): v is string => Boolean(v))
			.sort()
			.pop() ?? null;

	if (!anchorStart) return null;

	const rolling = computeRollingCycleAverages(
		sortedCycles,
		params.averageCycleDays ?? 28,
		params.averagePeriodDays ?? 5,
		params.todayDateKey,
	);
	const { confidence, predictionWindowDays } = computeCycleConfidence(
		params.cycleRegularity ?? "UNKNOWN",
		rolling.confirmedCyclesCount,
	);

	let nextPredictedStartDate = addDaysUtcKey(
		anchorStart,
		rolling.averageCycleDays,
	);
	let guard = 0;
	while (nextPredictedStartDate <= params.todayDateKey && guard < 120) {
		guard += 1;
		nextPredictedStartDate = addDaysUtcKey(
			nextPredictedStartDate,
			rolling.averageCycleDays,
		);
	}

	return {
		nextPredictedStartDate,
		daysUntilNextPeriod: diffDaysUtc(
			params.todayDateKey,
			nextPredictedStartDate,
		),
		confidence,
		predictionWindowDays,
		effectiveCycleDays: rolling.averageCycleDays,
		effectivePeriodDays: rolling.averagePeriodDays,
	};
}
