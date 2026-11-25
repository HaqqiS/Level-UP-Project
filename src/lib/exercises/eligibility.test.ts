import { describe, expect, it } from "vitest";
import {
	buildProgressionChain,
	type EligibilityProfile,
	type EligibleExerciseInput,
	filterEligibleExercises,
	isExerciseEligible,
} from "./eligibility";

const baseExercise: EligibleExerciseInput = {
	difficulty: 3,
	equipment: ["none"],
	contraindications: [],
	status: "VERIFIED",
};

const intermediateProfile: EligibilityProfile = {
	experienceLevel: "INTERMEDIATE",
	equipment: ["none", "pullup_bar"],
	injuries: ["wrist"],
};

describe("isExerciseEligible", () => {
	it("never assigns UNVERIFIED exercises to NONE or BEGINNER users", () => {
		const unverified: EligibleExerciseInput = {
			...baseExercise,
			difficulty: 2,
			status: "UNVERIFIED",
		};
		expect(
			isExerciseEligible(unverified, {
				...intermediateProfile,
				experienceLevel: "NONE",
			}),
		).toBe(false);
		expect(
			isExerciseEligible(unverified, {
				...intermediateProfile,
				experienceLevel: "BEGINNER",
			}),
		).toBe(false);
		expect(isExerciseEligible(unverified, intermediateProfile)).toBe(true);
	});

	it("rejects exercises requiring equipment the user does not own", () => {
		expect(
			isExerciseEligible(
				{ ...baseExercise, equipment: ["rings"] },
				intermediateProfile,
			),
		).toBe(false);
		expect(
			isExerciseEligible(
				{ ...baseExercise, equipment: ["pullup_bar"] },
				intermediateProfile,
			),
		).toBe(true);
	});

	it("rejects exercises contraindicated for user injuries", () => {
		expect(
			isExerciseEligible(
				{ ...baseExercise, contraindications: ["wrist", "shoulder"] },
				intermediateProfile,
			),
		).toBe(false);
	});

	it("enforces difficulty bands per experience level", () => {
		expect(
			isExerciseEligible(
				{ ...baseExercise, difficulty: 3 },
				{ ...intermediateProfile, experienceLevel: "NONE" },
			),
		).toBe(false);
		expect(
			isExerciseEligible(
				{ ...baseExercise, difficulty: 2 },
				{ ...intermediateProfile, experienceLevel: "NONE" },
			),
		).toBe(true);
		expect(
			isExerciseEligible(
				{ ...baseExercise, difficulty: 8 },
				intermediateProfile,
			),
		).toBe(false);
		expect(
			isExerciseEligible(
				{ ...baseExercise, difficulty: 8 },
				{ ...intermediateProfile, experienceLevel: "ADVANCED" },
			),
		).toBe(true);
	});

	it("filters a list of exercises", () => {
		const list: EligibleExerciseInput[] = [
			baseExercise,
			{ ...baseExercise, equipment: ["rings"] },
			{ ...baseExercise, status: "UNVERIFIED" },
		];
		expect(
			filterEligibleExercises(list, {
				...intermediateProfile,
				experienceLevel: "BEGINNER",
			}),
		).toHaveLength(1);
	});
});

describe("buildProgressionChain", () => {
	const chainData = [
		{ id: "a", progressionNextId: "b" },
		{ id: "b", progressionNextId: "c" },
		{ id: "c", progressionNextId: null },
		{ id: "x", progressionNextId: null },
	];

	it("returns full ordered chain regardless of which node is clicked", () => {
		expect(buildProgressionChain("b", chainData).map((e) => e.id)).toEqual([
			"a",
			"b",
			"c",
		]);
		expect(buildProgressionChain("c", chainData).map((e) => e.id)).toEqual([
			"a",
			"b",
			"c",
		]);
	});

	it("returns single element for standalone exercise and empty for missing ID", () => {
		expect(buildProgressionChain("x", chainData).map((e) => e.id)).toEqual([
			"x",
		]);
		expect(buildProgressionChain("missing", chainData)).toEqual([]);
	});

	it("guards against circular progression links", () => {
		const cyclic = [
			{ id: "1", progressionNextId: "2" },
			{ id: "2", progressionNextId: "1" },
		];
		expect(buildProgressionChain("1", cyclic)).toHaveLength(2);
	});
});
