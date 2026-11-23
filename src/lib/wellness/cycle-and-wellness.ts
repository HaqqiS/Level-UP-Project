import { z } from "zod";
import {
	CYCLE_REGULARITY_VALUES,
	type CyclePhase,
	type CycleRegularityValue,
	computeLutealAnchoredPhase,
	diffDaysUtc,
} from "./cycle-engine";

export {
	CYCLE_REGULARITY_VALUES,
	type CycleConfidence,
	type CycleEpisodeRecord,
	type CyclePhase,
	type CycleRegularityValue,
	computeCycleConfidence,
	computeLutealAnchoredPhase as computeDetailedCyclePhaseForDate,
	computeNextPeriodPrediction,
	computeRollingCycleAverages,
	type LutealCyclePhaseInfo,
	type NextPeriodPrediction,
	type ReconciledCycleEpisode,
	reconcilePeriodEpisodes,
} from "./cycle-engine";

export const PERIOD_FLOW_OPTIONS = [
	"light",
	"medium",
	"heavy",
	"super_heavy",
] as const;

export const PAIN_TAG_OPTIONS = [
	"pain_free",
	"cramps",
	"ovulation",
	"breast_tenderness",
	"headache",
	"migraine",
	"migraine_with_aura",
	"lower_back",
	"leg",
	"joint",
] as const;

export const FEMALE_ONLY_PAIN_TAGS = [
	"cramps",
	"ovulation",
	"breast_tenderness",
] as const;

export const SUPPLEMENT_OPTIONS = [
	"multivitamin",
	"magnesium",
	"iron",
	"folic_acid",
	"vitamin_d",
	"calcium",
] as const;

export const MEDICATION_OPTIONS = [
	"painkillers",
	"antihistamine",
	"antibiotics",
	"cold_or_flu_meds",
] as const;

export const MOOD_TAG_OPTIONS = [
	"calm",
	"motivated",
	"tired",
	"anxious",
	"irritable",
	"focused",
	"bloated",
] as const;

export const CYCLE_REGULARITY_OPTIONS = CYCLE_REGULARITY_VALUES;
export const WELLNESS_ITEM_KINDS = ["SUPPLEMENT", "MEDICATION"] as const;
export const HYDRATION_PRESETS_ML = [250, 500, 1000] as const;

export type PeriodFlowOption = (typeof PERIOD_FLOW_OPTIONS)[number];
export type PainTagOption = (typeof PAIN_TAG_OPTIONS)[number];
export type SupplementOption = (typeof SUPPLEMENT_OPTIONS)[number];
export type MedicationOption = (typeof MEDICATION_OPTIONS)[number];
export type MoodTagOption = (typeof MOOD_TAG_OPTIONS)[number];
export type WellnessItemKindValue = (typeof WELLNESS_ITEM_KINDS)[number];

export type CyclePhaseInfo = {
	phase: CyclePhase;
	dayInCycle: number;
	isPredictedPeriodDay: boolean;
};

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const CUSTOM_ITEM_SLUG_RE = /^[a-z0-9_:-]{1,48}$/;

export function slugifyWellnessItemName(name: string): string {
	const core = name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
	const slug = `custom:${core || "item"}`;
	return slug.slice(0, 48);
}

export const DailyWellnessLogInputSchema = z.object({
	date: z.string().regex(DATE_KEY_RE),
	periodFlow: z.enum(PERIOD_FLOW_OPTIONS).nullable().optional(),
	painTags: z.array(z.enum(PAIN_TAG_OPTIONS)).default([]),
	painSeverity: z.number().int().min(1).max(5).nullable().optional(),
	painDetails: z
		.record(z.string(), z.number().int().min(1).max(5))
		.refine(
			(rec) =>
				Object.keys(rec).every((k) =>
					(PAIN_TAG_OPTIONS as readonly string[]).includes(k),
				),
			"Unknown pain tag key in painDetails",
		)
		.nullable()
		.optional(),
	crampSeverity: z.number().int().min(1).max(5).nullable().optional(),
	medications: z
		.array(z.string().regex(CUSTOM_ITEM_SLUG_RE))
		.max(20)
		.default([]),
	supplements: z
		.array(z.string().regex(CUSTOM_ITEM_SLUG_RE))
		.max(20)
		.default([]),
	sleepTime: z.string().regex(TIME_HHMM_RE).nullable().optional(),
	wakeTime: z.string().regex(TIME_HHMM_RE).nullable().optional(),
	sleepQuality: z.number().int().min(1).max(5).nullable().optional(),
	energyLevel: z.number().int().min(1).max(5).nullable().optional(),
	stressLevel: z.number().int().min(1).max(5).nullable().optional(),
	moodTags: z.array(z.enum(MOOD_TAG_OPTIONS)).max(10).default([]),
	hydrationMl: z.number().int().min(0).max(10000).nullable().optional(),
	notes: z.string().max(300).nullable().optional(),
});

export type DailyWellnessLogInput = z.input<typeof DailyWellnessLogInputSchema>;

export const CycleSettingsInputSchema = z.object({
	tracksPeriod: z.boolean(),
	lastPeriodStartDate: z.string().regex(DATE_KEY_RE).nullable().optional(),
	averageCycleDays: z.number().int().min(20).max(45),
	averagePeriodDays: z.number().int().min(2).max(10),
	cycleRegularity: z.enum(CYCLE_REGULARITY_OPTIONS),
	lutealPhaseDays: z.number().int().min(10).max(17),
	periodReminderEnabled: z.boolean(),
});

export type CycleSettingsInput = z.input<typeof CycleSettingsInputSchema>;

export const CustomWellnessItemInputSchema = z.object({
	kind: z.enum(WELLNESS_ITEM_KINDS),
	name: z.string().trim().min(1).max(40),
});

export type CustomWellnessItemInput = z.input<
	typeof CustomWellnessItemInputSchema
>;

export const MenstrualCycleManualInputSchema = z
	.object({
		id: z.string().min(1).optional(),
		startDate: z.string().regex(DATE_KEY_RE),
		endDate: z.string().regex(DATE_KEY_RE).nullable().optional(),
		notes: z.string().max(300).nullable().optional(),
	})
	.refine(
		(val) => {
			if (!val.endDate) return true;
			const span = diffDaysUtc(val.startDate, val.endDate);
			return span >= 0 && span <= 13;
		},
		{
			message: "End date must be between start date and 14 days after",
			path: ["endDate"],
		},
	);

export type MenstrualCycleManualInput = z.input<
	typeof MenstrualCycleManualInputSchema
>;

export function getVisiblePainTags(
	tracksPeriod: boolean,
): readonly PainTagOption[] {
	if (tracksPeriod) return PAIN_TAG_OPTIONS;
	const femaleSet = new Set<string>(FEMALE_ONLY_PAIN_TAGS);
	return PAIN_TAG_OPTIONS.filter((tag) => !femaleSet.has(tag));
}

export function normalizePainTags(
	tags: readonly string[],
	allowFemaleTags: boolean,
): string[] {
	const femaleSet = new Set<string>(FEMALE_ONLY_PAIN_TAGS);
	const allowedSet = new Set<string>(PAIN_TAG_OPTIONS);
	const filtered = [...new Set(tags)].filter(
		(tag) => allowedSet.has(tag) && (allowFemaleTags || !femaleSet.has(tag)),
	);
	if (filtered.includes("pain_free")) {
		return ["pain_free"];
	}
	return filtered;
}

export function sanitizePainDetails(
	details: Record<string, number> | null | undefined,
	activePainTags: readonly string[],
	allowFemaleTags: boolean,
): Record<string, number> | null {
	if (!details || activePainTags.length === 0) return null;
	if (activePainTags.includes("pain_free")) return null;

	const femaleSet = new Set<string>(FEMALE_ONLY_PAIN_TAGS);
	const activeSet = new Set<string>(activePainTags);
	const clean: Record<string, number> = {};

	for (const [key, rawVal] of Object.entries(details)) {
		if (!activeSet.has(key)) continue;
		if (!allowFemaleTags && femaleSet.has(key)) continue;
		if (typeof rawVal !== "number" || !Number.isFinite(rawVal)) continue;
		clean[key] = Math.min(5, Math.max(1, Math.round(rawVal)));
	}

	return Object.keys(clean).length > 0 ? clean : null;
}

export function parsePainDetailsRecord(
	raw: unknown,
): Record<string, number> | null {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
	const out: Record<string, number> = {};
	for (const [k, v] of Object.entries(raw)) {
		if (typeof v === "number" && Number.isFinite(v)) {
			out[k] = v;
		}
	}
	return Object.keys(out).length > 0 ? out : null;
}

export function togglePainTag(
	current: readonly string[],
	clicked: PainTagOption,
): string[] {
	if (clicked === "pain_free") {
		return current.includes("pain_free") ? [] : ["pain_free"];
	}
	const withoutPainFree = current.filter((tag) => tag !== "pain_free");
	return withoutPainFree.includes(clicked)
		? withoutPainFree.filter((tag) => tag !== clicked)
		: [...withoutPainFree, clicked];
}

export function computeSleepDurationMinutes(
	sleepTime?: string | null,
	wakeTime?: string | null,
): number | null {
	if (!sleepTime || !wakeTime) return null;
	const sleepMatch = TIME_HHMM_RE.exec(sleepTime);
	const wakeMatch = TIME_HHMM_RE.exec(wakeTime);
	if (!sleepMatch || !wakeMatch) return null;

	const sleepMinutes = Number(sleepMatch[1]) * 60 + Number(sleepMatch[2]);
	const wakeMinutes = Number(wakeMatch[1]) * 60 + Number(wakeMatch[2]);

	let diff = wakeMinutes - sleepMinutes;
	if (diff <= 0) {
		diff += 24 * 60;
	}
	return diff;
}

export function formatSleepDuration(minutes?: number | null): string | null {
	if (typeof minutes !== "number" || minutes <= 0) return null;
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return `${hours}h ${mins}m`;
}

export function computeCyclePhaseForDate(params: {
	tracksPeriod: boolean;
	lastPeriodStartDate?: string | null;
	averageCycleDays?: number;
	averagePeriodDays?: number;
	lutealPhaseDays?: number;
	cycleRegularity?: CycleRegularityValue;
	targetDateKey: string;
}): CyclePhaseInfo | null {
	const detailed = computeLutealAnchoredPhase(params);
	if (!detailed) return null;
	return {
		phase: detailed.phase,
		dayInCycle: detailed.dayInCycle,
		isPredictedPeriodDay: detailed.isPredictedPeriodDay,
	};
}

export function mapWellnessPainTagsToInjuryAreas(
	painTags: readonly string[],
): string[] {
	const mapped = new Set<string>();
	for (const tag of painTags) {
		if (tag === "lower_back") mapped.add("lower_back");
		if (tag === "leg") mapped.add("knee");
		if (tag === "joint") {
			mapped.add("wrist");
			mapped.add("shoulder");
			mapped.add("elbow");
			mapped.add("knee");
		}
	}
	return [...mapped];
}

export type WellnessAiLogSlice = {
	date?: string;
	periodFlow?: string | null;
	painTags?: readonly string[];
	painSeverity?: number | null;
	painDetails?: Record<string, number> | null;
	crampSeverity?: number | null;
	medications?: readonly string[];
	supplements?: readonly string[];
	sleepDurationMinutes?: number | null;
	sleepQuality?: number | null;
	energyLevel?: number | null;
	stressLevel?: number | null;
	moodTags?: readonly string[];
	hydrationMl?: number | null;
};

export function buildWellnessAiContext(params: {
	cyclePhase?: Pick<CyclePhaseInfo, "phase" | "dayInCycle"> | null;
	cycleRegularity?: CycleRegularityValue | null;
	log?: WellnessAiLogSlice | null;
}): string {
	const lines: string[] = [];
	const { cyclePhase, cycleRegularity, log } = params;

	if (cyclePhase) {
		const regularityHint =
			cycleRegularity === "IRREGULAR"
				? " Cycle is marked irregular — treat phase dates as approximate and prioritize perceived readiness."
				: "";
		if (cyclePhase.phase === "menstrual") {
			lines.push(
				`Cycle context: Day ${cyclePhase.dayInCycle} (menstrual phase). Favor gentler intensity/volume and include mobility or controlled recovery while staying within safety bounds.${regularityHint}`,
			);
		} else if (cyclePhase.phase === "luteal") {
			lines.push(
				`Cycle context: Day ${cyclePhase.dayInCycle} (luteal phase). Monitor perceived fatigue and keep progression steady without excessive strain.${regularityHint}`,
			);
		} else {
			lines.push(
				`Cycle context: Day ${cyclePhase.dayInCycle} (${cyclePhase.phase} phase). Normal structured progression applies.${regularityHint}`,
			);
		}
	}

	if (log) {
		if (log.periodFlow) {
			const crampNote =
				typeof log.crampSeverity === "number"
					? ` with cramp severity ${log.crampSeverity}/5`
					: "";
			lines.push(
				`Reported period flow today: ${log.periodFlow}${crampNote}. Reduce high-impact abdominal pressure if heavy/super_heavy or cramp severity >= 4.`,
			);
		} else if (typeof log.crampSeverity === "number" && log.crampSeverity > 0) {
			lines.push(
				`Reported cramp severity: ${log.crampSeverity}/5. Favor gentler core compression and recovery mobility.`,
			);
		}

		const activePain = (log.painTags ?? []).filter((t) => t !== "pain_free");
		if (activePain.length > 0) {
			const sevNote =
				typeof log.painSeverity === "number"
					? ` (overall severity ${log.painSeverity}/5)`
					: "";
			const detailPairs = log.painDetails
				? Object.entries(log.painDetails)
						.filter(([k]) => activePain.includes(k))
						.map(([k, v]) => `${k}:${v}/5`)
				: [];
			const detailSuffix =
				detailPairs.length > 0 ? ` [${detailPairs.join(", ")}]` : "";
			lines.push(
				`Reported wellness pain/symptoms: ${activePain.join(", ")}${sevNote}${detailSuffix}. Reduce session intensity or prioritize mobility when cramps, migraine, headache, or severity >= 4 are present.`,
			);
		}

		if (log.medications && log.medications.length > 0) {
			lines.push(
				`Logged medications: ${log.medications.join(", ")}. Keep training conservative if taking painkillers, antibiotics, or cold/flu medication.`,
			);
		}

		if (
			typeof log.sleepDurationMinutes === "number" &&
			log.sleepDurationMinutes > 0
		) {
			const formatted = formatSleepDuration(log.sleepDurationMinutes);
			const qualityNote =
				typeof log.sleepQuality === "number"
					? `, quality ${log.sleepQuality}/5`
					: "";
			if (
				log.sleepDurationMinutes < 360 ||
				(typeof log.sleepQuality === "number" && log.sleepQuality <= 2)
			) {
				lines.push(
					`Sub-optimal sleep logged (${formatted}${qualityNote}). Reduce volume conservatively for recovery.`,
				);
			} else {
				lines.push(`Sleep logged: ${formatted}${qualityNote}.`);
			}
		} else if (typeof log.sleepQuality === "number") {
			lines.push(`Sleep quality rating: ${log.sleepQuality}/5.`);
		}

		const readinessParts: string[] = [];
		if (typeof log.energyLevel === "number") {
			readinessParts.push(`energy ${log.energyLevel}/5`);
		}
		if (typeof log.stressLevel === "number") {
			readinessParts.push(`stress ${log.stressLevel}/5`);
		}
		if (log.moodTags && log.moodTags.length > 0) {
			readinessParts.push(`mood: ${log.moodTags.join(", ")}`);
		}
		if (typeof log.hydrationMl === "number" && log.hydrationMl > 0) {
			readinessParts.push(`hydration ${log.hydrationMl}ml`);
		}
		if (readinessParts.length > 0) {
			const caution =
				(typeof log.energyLevel === "number" && log.energyLevel <= 2) ||
				(typeof log.stressLevel === "number" && log.stressLevel >= 4)
					? " Consider lower RPE and extra rest between sets within safe bounds."
					: "";
			lines.push(
				`Daily wellness readiness: ${readinessParts.join(", ")}.${caution}`,
			);
		}
	}

	return lines.join("\n");
}

export function buildWeeklyWellnessTrendContext(
	recentLogs: readonly WellnessAiLogSlice[],
): string {
	if (recentLogs.length === 0) return "";

	const lines: string[] = [];
	const sleepDurations = recentLogs
		.map((l) => l.sleepDurationMinutes)
		.filter((v): v is number => typeof v === "number" && v > 0);
	const sleepQualities = recentLogs
		.map((l) => l.sleepQuality)
		.filter((v): v is number => typeof v === "number" && v > 0);
	if (sleepDurations.length > 0 || sleepQualities.length > 0) {
		const avgSleepMin =
			sleepDurations.length > 0
				? Math.round(
						sleepDurations.reduce((a, b) => a + b, 0) / sleepDurations.length,
					)
				: null;
		const shortNights = sleepDurations.filter((m) => m < 360).length;
		const avgQuality =
			sleepQualities.length > 0
				? (
						sleepQualities.reduce((a, b) => a + b, 0) / sleepQualities.length
					).toFixed(1)
				: null;
		const parts: string[] = [];
		if (avgSleepMin) {
			parts.push(
				`avg duration ${formatSleepDuration(avgSleepMin)} (${sleepDurations.length} nights)`,
			);
		}
		if (shortNights > 0) parts.push(`${shortNights} night(s) < 6h`);
		if (avgQuality) parts.push(`avg quality ${avgQuality}/5`);
		lines.push(`Recent sleep trend: ${parts.join(", ")}.`);
	}

	const painCounts = new Map<string, number>();
	let maxPainSeverity = 0;
	let crampDays = 0;
	let maxCrampSeverity = 0;
	for (const log of recentLogs) {
		for (const tag of log.painTags ?? []) {
			if (tag !== "pain_free") {
				painCounts.set(tag, (painCounts.get(tag) ?? 0) + 1);
			}
		}
		if (typeof log.painSeverity === "number") {
			maxPainSeverity = Math.max(maxPainSeverity, log.painSeverity);
		}
		if (
			(log.painTags ?? []).includes("cramps") ||
			(typeof log.crampSeverity === "number" && log.crampSeverity > 0)
		) {
			crampDays += 1;
			maxCrampSeverity = Math.max(maxCrampSeverity, log.crampSeverity ?? 0);
		}
	}
	if (painCounts.size > 0 || crampDays > 0) {
		const topPain = [...painCounts.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 4)
			.map(([tag, count]) => `${tag} (${count}d)`);
		const extra: string[] = [];
		if (maxPainSeverity > 0) extra.push(`peak pain ${maxPainSeverity}/5`);
		if (crampDays > 0) {
			extra.push(
				`cramps ${crampDays}d${maxCrampSeverity > 0 ? ` (peak ${maxCrampSeverity}/5)` : ""}`,
			);
		}
		lines.push(`7-day symptom summary: ${[...topPain, ...extra].join(", ")}.`);
	}

	const energyVals = recentLogs
		.map((l) => l.energyLevel)
		.filter((v): v is number => typeof v === "number" && v > 0);
	const stressVals = recentLogs
		.map((l) => l.stressLevel)
		.filter((v): v is number => typeof v === "number" && v > 0);
	const medsSet = new Set<string>();
	for (const log of recentLogs) {
		for (const med of log.medications ?? []) medsSet.add(med);
	}
	const readinessTrend: string[] = [];
	if (energyVals.length > 0) {
		readinessTrend.push(
			`avg energy ${(energyVals.reduce((a, b) => a + b, 0) / energyVals.length).toFixed(1)}/5`,
		);
	}
	if (stressVals.length > 0) {
		readinessTrend.push(
			`avg stress ${(stressVals.reduce((a, b) => a + b, 0) / stressVals.length).toFixed(1)}/5`,
		);
	}
	if (medsSet.size > 0) {
		readinessTrend.push(`recent medications: ${[...medsSet].join(", ")}`);
	}
	if (readinessTrend.length > 0) {
		lines.push(`7-day readiness & meds: ${readinessTrend.join(", ")}.`);
	}

	return lines.join("\n");
}
