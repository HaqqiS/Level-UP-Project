import { z } from "zod";

export const LogWeightInputSchema = z.object({
	weightKg: z.number().min(25).max(300),
});

export type LogWeightInput = z.input<typeof LogWeightInputSchema>;

export type WeightEntryPoint = {
	id: string;
	dateKey: string; // YYYY-MM-DD
	valueKg: number;
	measuredAt: string; // ISO timestamp
};

export type WeightSummary = {
	currentWeightKg: number | null;
	startWeightKg: number | null;
	deltaKg: number | null;
	minWeightKg: number | null;
	maxWeightKg: number | null;
	bmi: number | null;
};

function round1(value: number): number {
	return Math.round(value * 10) / 10;
}

function subtractDaysUtc(dateKey: string, days: number): string {
	const date = new Date(`${dateKey}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() - days);
	return date.toISOString().slice(0, 10);
}

/**
 * Filters weight entries to the last `days` calendar days, deduplicates multiple
 * entries on the same date (keeping the latest measurement), and sorts ascending.
 */
export function filterWeightSeriesByDays(
	entries: readonly WeightEntryPoint[],
	days: 30 | 90,
	todayKey: string,
): WeightEntryPoint[] {
	const cutoffKey = subtractDaysUtc(todayKey, days - 1);
	const latestByDate = new Map<string, WeightEntryPoint>();

	for (const entry of entries) {
		if (entry.dateKey < cutoffKey || entry.dateKey > todayKey) continue;
		const existing = latestByDate.get(entry.dateKey);
		if (!existing || entry.measuredAt > existing.measuredAt) {
			latestByDate.set(entry.dateKey, entry);
		}
	}

	return [...latestByDate.values()].sort((a, b) =>
		a.dateKey.localeCompare(b.dateKey),
	);
}

export function computeWeightSummary(params: {
	series: readonly WeightEntryPoint[];
	latestWeightKg: number | null;
	latestHeightCm: number | null;
}): WeightSummary {
	const { series, latestWeightKg, latestHeightCm } = params;
	const currentWeightKg =
		series.length > 0
			? round1(series[series.length - 1].valueKg)
			: latestWeightKg !== null
				? round1(latestWeightKg)
				: null;

	const startWeightKg = series.length > 0 ? round1(series[0].valueKg) : null;
	const deltaKg =
		currentWeightKg !== null && startWeightKg !== null
			? round1(currentWeightKg - startWeightKg)
			: null;

	let minWeightKg: number | null = null;
	let maxWeightKg: number | null = null;
	for (const point of series) {
		const v = round1(point.valueKg);
		if (minWeightKg === null || v < minWeightKg) minWeightKg = v;
		if (maxWeightKg === null || v > maxWeightKg) maxWeightKg = v;
	}

	const bmi =
		currentWeightKg !== null && latestHeightCm !== null && latestHeightCm > 0
			? round1(currentWeightKg / (latestHeightCm / 100) ** 2)
			: null;

	return {
		currentWeightKg,
		startWeightKg,
		deltaKg,
		minWeightKg,
		maxWeightKg,
		bmi,
	};
}
