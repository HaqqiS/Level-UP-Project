import { describe, expect, it } from "vitest";
import {
	computeCycleConfidence,
	computeLutealAnchoredPhase,
	computeNextPeriodPrediction,
	computeRollingCycleAverages,
	reconcilePeriodEpisodes,
} from "./cycle-engine";

describe("reconcilePeriodEpisodes", () => {
	it("groups contiguous days and single-day gaps while splitting separate cycles", () => {
		const episodes = reconcilePeriodEpisodes([
			"2026-10-01",
			"2026-10-02",
			"2026-10-04", // 1-day gap -> merges into Oct 1..4 episode
			"2026-10-05",
			"2026-10-30", // 29-day cycle from Oct 1
			"2026-10-31",
			"2026-11-01",
		]);

		expect(episodes).toEqual([
			{
				startDate: "2026-10-01",
				endDate: "2026-10-05",
				periodLengthDays: 5,
				cycleLengthDays: 29,
			},
			{
				startDate: "2026-10-30",
				endDate: "2026-11-01",
				periodLengthDays: 3,
				cycleLengthDays: null,
			},
		]);
	});

	it("caps a single episode at 10 days even with continuous logs", () => {
		const dates = Array.from(
			{ length: 12 },
			(_, idx) => `2026-11-${String(idx + 1).padStart(2, "0")}`,
		);
		const episodes = reconcilePeriodEpisodes(dates);
		expect(episodes).toHaveLength(2);
		expect(episodes[0]?.periodLengthDays).toBe(10);
		expect(episodes[1]?.periodLengthDays).toBe(2);
	});
});

describe("computeRollingCycleAverages & confidence", () => {
	it("computes rolling average from up to last 6 confirmed cycles and falls back safely", () => {
		const avg = computeRollingCycleAverages(
			[
				{ startDate: "2026-06-01", cycleLengthDays: 28, periodLengthDays: 5 },
				{ startDate: "2026-06-29", cycleLengthDays: 30, periodLengthDays: 6 },
				{ startDate: "2026-07-29", cycleLengthDays: 29, periodLengthDays: 4 },
			],
			28,
			5,
		);
		expect(avg).toEqual({
			averageCycleDays: 29,
			averagePeriodDays: 5,
			confirmedCyclesCount: 3,
			confirmedPeriodsCount: 3,
		});

		const fallback = computeRollingCycleAverages([], 31, 4);
		expect(fallback).toEqual({
			averageCycleDays: 31,
			averagePeriodDays: 4,
			confirmedCyclesCount: 0,
			confirmedPeriodsCount: 0,
		});
	});

	it("computes confidence windows for REGULAR vs IRREGULAR cycles", () => {
		expect(computeCycleConfidence("REGULAR", 2)).toEqual({
			confidence: "high",
			predictionWindowDays: 1,
		});
		expect(computeCycleConfidence("IRREGULAR", 5)).toEqual({
			confidence: "low",
			predictionWindowDays: 3,
		});
		expect(computeCycleConfidence("UNKNOWN", 1)).toEqual({
			confidence: "medium",
			predictionWindowDays: 2,
		});
	});
});

describe("computeLutealAnchoredPhase & computeNextPeriodPrediction", () => {
	it("anchors ovulation using lutealPhaseDays and marks confirmed vs predicted days", () => {
		const base = {
			tracksPeriod: true,
			averageCycleDays: 30,
			averagePeriodDays: 5,
			lutealPhaseDays: 12, // ovulationDay = 30 - 12 = 18
			cycleRegularity: "REGULAR" as const,
			cycles: [
				{
					startDate: "2026-11-01",
					endDate: "2026-11-05",
					periodLengthDays: 5,
					isConfirmed: true,
				},
			],
		};

		const confirmedDay = computeLutealAnchoredPhase({
			...base,
			targetDateKey: "2026-11-03",
		});
		expect(confirmedDay).toMatchObject({
			phase: "menstrual",
			dayInCycle: 3,
			isConfirmedPeriodDay: true,
			isPredictedPeriodDay: false,
		});

		// Day 10 = Nov 10 -> follicular phase
		const follicular = computeLutealAnchoredPhase({
			...base,
			targetDateKey: "2026-11-10",
		});
		expect(follicular).toMatchObject({
			phase: "follicular",
			dayInCycle: 10,
		});

		// Day 18 = Nov 18 -> ovulatory phase
		const ovulation = computeLutealAnchoredPhase({
			...base,
			targetDateKey: "2026-11-18",
		});
		expect(ovulation).toMatchObject({
			phase: "ovulatory",
			dayInCycle: 18,
		});

		// Day 24 = Nov 24 -> luteal phase
		const luteal = computeLutealAnchoredPhase({
			...base,
			targetDateKey: "2026-11-24",
		});
		expect(luteal).toMatchObject({
			phase: "luteal",
			dayInCycle: 24,
		});

		// Next cycle predicted Dec 1..5
		const nextPredicted = computeLutealAnchoredPhase({
			...base,
			targetDateKey: "2026-12-01",
		});
		expect(nextPredicted).toMatchObject({
			phase: "menstrual",
			dayInCycle: 1,
			isConfirmedPeriodDay: false,
			isPredictedPeriodDay: true,
		});
	});

	it("computes daysUntilNextPeriod cleanly across month boundary", () => {
		const prediction = computeNextPeriodPrediction({
			tracksPeriod: true,
			lastPeriodStartDate: "2026-11-01",
			averageCycleDays: 28,
			averagePeriodDays: 5,
			cycleRegularity: "REGULAR",
			cycles: [
				{
					startDate: "2026-10-04",
					cycleLengthDays: 28,
					periodLengthDays: 5,
					isConfirmed: true,
				},
				{
					startDate: "2026-11-01",
					cycleLengthDays: 28,
					periodLengthDays: 5,
					isConfirmed: true,
				},
			],
			todayDateKey: "2026-11-27",
		});

		expect(prediction).toEqual({
			nextPredictedStartDate: "2026-11-29",
			daysUntilNextPeriod: 2,
			confidence: "high",
			predictionWindowDays: 1,
			effectiveCycleDays: 28,
			effectivePeriodDays: 5,
		});
	});

	it("preserves configured averagePeriodDays when an ongoing episode only has 2 logged days so far", () => {
		const cycles = [
			{
				startDate: "2026-11-21",
				endDate: "2026-11-22",
				cycleLengthDays: null,
				periodLengthDays: 2,
				isConfirmed: true,
			},
		];

		const day2Confirmed = computeLutealAnchoredPhase({
			tracksPeriod: true,
			lastPeriodStartDate: "2026-11-21",
			averageCycleDays: 28,
			averagePeriodDays: 5,
			cycleRegularity: "REGULAR",
			cycles,
			targetDateKey: "2026-11-22",
			todayDateKey: "2026-11-22",
			hasLoggedPeriodFlowOnDate: true,
		});
		expect(day2Confirmed).toMatchObject({
			isConfirmedPeriodDay: true,
			isPredictedPeriodDay: false,
		});

		for (const dateKey of ["2026-11-23", "2026-11-24", "2026-11-25"]) {
			const predicted = computeLutealAnchoredPhase({
				tracksPeriod: true,
				lastPeriodStartDate: "2026-11-21",
				averageCycleDays: 28,
				averagePeriodDays: 5,
				cycleRegularity: "REGULAR",
				cycles,
				targetDateKey: dateKey,
				todayDateKey: "2026-11-22",
			});
			expect(predicted).toMatchObject({
				isConfirmedPeriodDay: false,
				isPredictedPeriodDay: true,
			});
		}

		// Day 6 is outside the 5-day predicted period window
		const day6 = computeLutealAnchoredPhase({
			tracksPeriod: true,
			lastPeriodStartDate: "2026-11-21",
			averageCycleDays: 28,
			averagePeriodDays: 5,
			cycleRegularity: "REGULAR",
			cycles,
			targetDateKey: "2026-11-26",
			todayDateKey: "2026-11-22",
		});
		expect(day6).toMatchObject({
			phase: "follicular",
			isConfirmedPeriodDay: false,
			isPredictedPeriodDay: false,
		});

		// Self-heals when averagePeriodDays was previously corrupted to 2 by the ongoing 2-day episode
		const selfHealedDay3 = computeLutealAnchoredPhase({
			tracksPeriod: true,
			lastPeriodStartDate: "2026-11-21",
			averageCycleDays: 28,
			averagePeriodDays: 2,
			cycleRegularity: "REGULAR",
			cycles,
			targetDateKey: "2026-11-23",
			todayDateKey: "2026-11-22",
		});
		expect(selfHealedDay3).toMatchObject({
			isConfirmedPeriodDay: false,
			isPredictedPeriodDay: true,
		});
	});
});
