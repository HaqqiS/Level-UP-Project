import { describe, expect, it } from "vitest";
import {
	computeWeightSummary,
	filterWeightSeriesByDays,
	groupMeasurementEntries,
	LogMeasurementsBatchInputSchema,
	LogWeightInputSchema,
	type MeasurementEntryPoint,
	type WeightEntryPoint,
} from "./metrics";

describe("LogWeightInputSchema", () => {
	it("accepts valid weights and rejects out-of-range values", () => {
		expect(LogWeightInputSchema.safeParse({ weightKg: 70.5 }).success).toBe(
			true,
		);
		expect(LogWeightInputSchema.safeParse({ weightKg: 24.9 }).success).toBe(
			false,
		);
		expect(LogWeightInputSchema.safeParse({ weightKg: 300.1 }).success).toBe(
			false,
		);
	});
});

describe("filterWeightSeriesByDays", () => {
	const entries: WeightEntryPoint[] = [
		{
			id: "old-95",
			dateKey: "2026-08-15",
			valueKg: 75.0,
			measuredAt: "2026-08-15T08:00:00.000Z",
		},
		{
			id: "d45",
			dateKey: "2026-10-05",
			valueKg: 73.5,
			measuredAt: "2026-10-05T08:00:00.000Z",
		},
		{
			id: "d10-am",
			dateKey: "2026-11-10",
			valueKg: 72.2,
			measuredAt: "2026-11-10T07:00:00.000Z",
		},
		{
			id: "d10-pm",
			dateKey: "2026-11-10",
			valueKg: 71.8,
			measuredAt: "2026-11-10T19:00:00.000Z",
		},
		{
			id: "today",
			dateKey: "2026-11-19",
			valueKg: 71.2,
			measuredAt: "2026-11-19T08:00:00.000Z",
		},
	];

	it("filters 30d window, deduplicates same day keeping latest, and sorts ascending", () => {
		const res = filterWeightSeriesByDays(entries, 30, "2026-11-19");
		expect(res.map((e) => e.id)).toEqual(["d10-pm", "today"]);
		expect(res.map((e) => e.valueKg)).toEqual([71.8, 71.2]);
	});

	it("filters 90d window including earlier points while excluding >90d points", () => {
		const res = filterWeightSeriesByDays(entries, 90, "2026-11-19");
		expect(res.map((e) => e.id)).toEqual(["d45", "d10-pm", "today"]);
	});
});

describe("computeWeightSummary", () => {
	it("computes delta, min/max, and BMI accurately", () => {
		const series = filterWeightSeriesByDays(
			[
				{
					id: "1",
					dateKey: "2026-11-01",
					valueKg: 72.5,
					measuredAt: "2026-11-01T08:00:00.000Z",
				},
				{
					id: "2",
					dateKey: "2026-11-19",
					valueKg: 70.0,
					measuredAt: "2026-11-19T08:00:00.000Z",
				},
			],
			30,
			"2026-11-19",
		);

		const summary = computeWeightSummary({
			series,
			latestWeightKg: 70.0,
			latestHeightCm: 175,
		});

		expect(summary).toEqual({
			currentWeightKg: 70.0,
			startWeightKg: 72.5,
			deltaKg: -2.5,
			minWeightKg: 70.0,
			maxWeightKg: 72.5,
			bmi: 22.9,
		});
	});
});

describe("LogMeasurementsBatchInputSchema", () => {
	it("accepts all 3 measurements, partial subsets, and rejects empty or out-of-range inputs", () => {
		expect(
			LogMeasurementsBatchInputSchema.safeParse({
				waistCm: 80.5,
				chestCm: 96,
				armCm: 33.2,
			}).success,
		).toBe(true);
		expect(
			LogMeasurementsBatchInputSchema.safeParse({
				waistCm: 79,
				chestCm: null,
				armCm: undefined,
			}).success,
		).toBe(true);
		expect(
			LogMeasurementsBatchInputSchema.safeParse({
				waistCm: null,
				chestCm: null,
				armCm: null,
			}).success,
		).toBe(false);
		expect(
			LogMeasurementsBatchInputSchema.safeParse({
				waistCm: 14.9,
			}).success,
		).toBe(false);
		expect(
			LogMeasurementsBatchInputSchema.safeParse({
				armCm: 250.1,
			}).success,
		).toBe(false);
	});
});

describe("groupMeasurementEntries", () => {
	it("groups batch entries sharing the same measuredAt timestamp and sorts newest-first", () => {
		const entries: MeasurementEntryPoint[] = [
			{
				id: "legacy-chest",
				type: "CHEST",
				dateKey: "2026-11-20",
				valueCm: 94.04,
				measuredAt: "2026-11-20T07:00:00.000Z",
			},
			{
				id: "batch-waist",
				type: "WAIST",
				dateKey: "2026-11-23",
				valueCm: 80.24,
				measuredAt: "2026-11-23T08:00:00.000Z",
			},
			{
				id: "batch-chest",
				type: "CHEST",
				dateKey: "2026-11-23",
				valueCm: 95.56,
				measuredAt: "2026-11-23T08:00:00.000Z",
			},
			{
				id: "batch-arm",
				type: "ARM",
				dateKey: "2026-11-23",
				valueCm: 32.5,
				measuredAt: "2026-11-23T08:00:00.000Z",
			},
		];

		const groups = groupMeasurementEntries(entries);
		expect(groups).toHaveLength(2);
		expect(groups[0]).toEqual({
			key: "2026-11-23T08:00:00.000Z|2026-11-23",
			dateKey: "2026-11-23",
			measuredAt: "2026-11-23T08:00:00.000Z",
			metricIds: ["batch-waist", "batch-chest", "batch-arm"],
			values: { WAIST: 80.2, CHEST: 95.6, ARM: 32.5 },
		});
		expect(groups[1]).toEqual({
			key: "2026-11-20T07:00:00.000Z|2026-11-20",
			dateKey: "2026-11-20",
			measuredAt: "2026-11-20T07:00:00.000Z",
			metricIds: ["legacy-chest"],
			values: { CHEST: 94.0 },
		});
	});
});
