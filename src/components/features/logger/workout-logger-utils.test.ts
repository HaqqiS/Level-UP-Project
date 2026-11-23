import { describe, expect, it } from "vitest";
import {
	getNextAccordionItemAfterLog,
	type LoggerExerciseSlot,
} from "./workout-logger-utils";

const SAMPLE_EXERCISES: LoggerExerciseSlot[] = [
	{ id: "slot-1", exerciseId: "ex-1", sets: 2 },
	{ id: "slot-2", exerciseId: "ex-2", sets: 3 },
	{ id: "slot-3", exerciseId: "ex-3", sets: 2 },
];

describe("getNextAccordionItemAfterLog", () => {
	it("stays on the current exercise when logging a partial set (0/2 -> 1/2)", () => {
		const nextId = getNextAccordionItemAfterLog({
			exercises: SAMPLE_EXERCISES,
			loggedPlannedId: "slot-1",
			loggedExerciseId: "ex-1",
			previousCount: 0,
			newCount: 1,
			countsByExerciseId: new Map(),
		});

		expect(nextId).toBeNull();
	});

	it("advances to the next incomplete exercise when completing target sets (1/2 -> 2/2)", () => {
		const nextId = getNextAccordionItemAfterLog({
			exercises: SAMPLE_EXERCISES,
			loggedPlannedId: "slot-1",
			loggedExerciseId: "ex-1",
			previousCount: 1,
			newCount: 2,
			countsByExerciseId: new Map([["ex-1", 1]]),
		});

		expect(nextId).toBe("slot-2");
	});

	it("stays open when logging a bonus set beyond target (2/2 -> 3/2)", () => {
		const nextId = getNextAccordionItemAfterLog({
			exercises: SAMPLE_EXERCISES,
			loggedPlannedId: "slot-1",
			loggedExerciseId: "ex-1",
			previousCount: 2,
			newCount: 3,
			countsByExerciseId: new Map([["ex-1", 2]]),
		});

		expect(nextId).toBeNull();
	});

	it("wraps around to an earlier incomplete exercise when completing a later one", () => {
		const nextId = getNextAccordionItemAfterLog({
			exercises: SAMPLE_EXERCISES,
			loggedPlannedId: "slot-2",
			loggedExerciseId: "ex-2",
			previousCount: 2,
			newCount: 3,
			countsByExerciseId: new Map([
				["ex-1", 0],
				["ex-2", 2],
				["ex-3", 2],
			]),
		});

		expect(nextId).toBe("slot-1");
	});

	it("returns null when the final remaining exercise is completed", () => {
		const nextId = getNextAccordionItemAfterLog({
			exercises: SAMPLE_EXERCISES,
			loggedPlannedId: "slot-3",
			loggedExerciseId: "ex-3",
			previousCount: 1,
			newCount: 2,
			countsByExerciseId: new Map([
				["ex-1", 2],
				["ex-2", 3],
				["ex-3", 1],
			]),
		});

		expect(nextId).toBeNull();
	});
});
