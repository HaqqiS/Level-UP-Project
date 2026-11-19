import { describe, expect, it } from "vitest";
import {
	computeWeightSummary,
	filterWeightSeriesByDays,
	LogWeightInputSchema,
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
