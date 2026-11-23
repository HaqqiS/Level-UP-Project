import { describe, expect, it } from "vitest";
import {
	evaluateSkillTree,
	type SkillTreeBenchmarkInput,
	type SkillTreeEdgeInput,
	type SkillTreeExerciseInput,
} from "./skill-tree";

const CHAIN: SkillTreeExerciseInput[] = [
	{
		id: "ex-wall",
		slug: "wall-pushup",
		name: "Wall Push-up",
		pattern: "PUSH",
		difficulty: 1,
		measure: "REPS",
		progressionNextId: "ex-incline",
		masteryTargetSets: 3,
		masteryTargetReps: 12,
		masteryTargetSeconds: null,
	},
	{
		id: "ex-incline",
		slug: "incline-pushup",
		name: "Incline Push-up",
		pattern: "PUSH",
		difficulty: 2,
		measure: "REPS",
		progressionNextId: "ex-standard",
		masteryTargetSets: 3,
		masteryTargetReps: 10,
		masteryTargetSeconds: null,
	},
	{
		id: "ex-standard",
		slug: "pushup",
		name: "Standard Push-up",
		pattern: "PUSH",
		difficulty: 4,
		measure: "REPS",
		progressionNextId: null,
		masteryTargetSets: 3,
		masteryTargetReps: 10,
		masteryTargetSeconds: null,
	},
];

const THREE_TIER_BENCHMARKS: SkillTreeBenchmarkInput[] = [
	{
		tier: "GOLD",
		targetSets: 4,
		targetReps: 12,
		targetSeconds: null,
		minConsecutiveSessions: 2,
		maxRpe: 8,
		tempo: "2-1-1-0",
		formStandard: "Chest to floor, full lockout",
		unlocksNext: false,
	},
	{
		tier: "BRONZE",
		targetSets: 3,
		targetReps: 8,
		targetSeconds: null,
		minConsecutiveSessions: 2,
		maxRpe: 9,
		tempo: "2-1-1-0",
		formStandard: "Controlled reps",
		unlocksNext: true,
	},
	{
		tier: "SILVER",
		targetSets: 3,
		targetReps: 10,
		targetSeconds: null,
		minConsecutiveSessions: 2,
		maxRpe: 9,
		tempo: "2-1-1-0",
		formStandard: "Clean pause at bottom",
		unlocksNext: true,
	},
];

describe("evaluateSkillTree", () => {
	it("marks root ongoing and downstream nodes locked when no logs exist", () => {
		const res = evaluateSkillTree({
			exercises: CHAIN,
			setLogs: [],
			experienceLevel: "BEGINNER",
		});

		expect(res.masteryByExerciseId["ex-wall"]?.status).toBe("ongoing");
		expect(res.masteryByExerciseId["ex-incline"]?.status).toBe("locked");
		expect(res.masteryByExerciseId["ex-standard"]?.status).toBe("locked");
		expect(res.branchesByPattern.PUSH).toHaveLength(1);
		expect(res.branchesByPattern.PUSH[0]?.nodes.map((n) => n.id)).toEqual([
			"ex-wall",
			"ex-incline",
			"ex-standard",
		]);
		expect(res.counts).toEqual({
			mastered: 0,
			ongoing: 1,
			locked: 2,
			bronze: 0,
			silver: 0,
			gold: 0,
		});
	});

	it("unlocks child node as ongoing once parent benchmark is mastered", () => {
		const res = evaluateSkillTree({
			exercises: CHAIN,
			setLogs: [
				{ workoutLogId: "w1", exerciseId: "ex-wall", reps: 12, seconds: null },
				{ workoutLogId: "w1", exerciseId: "ex-wall", reps: 12, seconds: null },
				{ workoutLogId: "w1", exerciseId: "ex-wall", reps: 14, seconds: null },
			],
			experienceLevel: "BEGINNER",
		});

		expect(res.masteryByExerciseId["ex-wall"]?.status).toBe("mastered");
		expect(res.masteryByExerciseId["ex-wall"]?.highestTier).toBe("BRONZE");
		expect(res.masteryByExerciseId["ex-incline"]?.status).toBe("ongoing");
		expect(res.masteryByExerciseId["ex-standard"]?.status).toBe("locked");
	});

	it("propagates mastery backward to prerequisite regressions", () => {
		const res = evaluateSkillTree({
			exercises: CHAIN,
			setLogs: [
				{
					workoutLogId: "w2",
					exerciseId: "ex-incline",
					reps: 10,
					seconds: null,
				},
				{
					workoutLogId: "w2",
					exerciseId: "ex-incline",
					reps: 10,
					seconds: null,
				},
				{
					workoutLogId: "w2",
					exerciseId: "ex-incline",
					reps: 10,
					seconds: null,
				},
			],
			experienceLevel: "INTERMEDIATE",
		});

		expect(res.masteryByExerciseId["ex-wall"]?.status).toBe("mastered");
		expect(res.masteryByExerciseId["ex-wall"]?.impliedByProgression).toBe(true);
		expect(res.masteryByExerciseId["ex-wall"]?.highestTier).toBe("BRONZE");
		expect(res.masteryByExerciseId["ex-incline"]?.status).toBe("mastered");
		expect(res.masteryByExerciseId["ex-incline"]?.impliedByProgression).toBe(
			false,
		);
		expect(res.masteryByExerciseId["ex-standard"]?.status).toBe("ongoing");
	});

	it("evaluates 3-tier consecutive sessions chronologically by date", () => {
		const exercises: SkillTreeExerciseInput[] = [
			{
				...CHAIN[2],
				id: "ex-pushup",
				masteryBenchmarks: THREE_TIER_BENCHMARKS,
			},
		];

		// Logs intentionally passed out of chronological order:
		// 2026-01-01: 3x8 (BRONZE session 1)
		// 2026-01-05: 2x8 (fails -> breaks streak!)
		// 2026-01-08: 3x10 (SILVER/BRONZE session 1)
		// 2026-01-12: 3x10 (SILVER/BRONZE session 2 -> achieves BRONZE & SILVER!)
		const res = evaluateSkillTree({
			exercises,
			setLogs: [
				{
					workoutLogId: "w-jan8",
					exerciseId: "ex-pushup",
					reps: 10,
					seconds: null,
					date: "2026-01-08",
				},
				{
					workoutLogId: "w-jan8",
					exerciseId: "ex-pushup",
					reps: 10,
					seconds: null,
					date: "2026-01-08",
				},
				{
					workoutLogId: "w-jan8",
					exerciseId: "ex-pushup",
					reps: 10,
					seconds: null,
					date: "2026-01-08",
				},
				{
					workoutLogId: "w-jan1",
					exerciseId: "ex-pushup",
					reps: 8,
					seconds: null,
					date: "2026-01-01",
				},
				{
					workoutLogId: "w-jan1",
					exerciseId: "ex-pushup",
					reps: 8,
					seconds: null,
					date: "2026-01-01",
				},
				{
					workoutLogId: "w-jan1",
					exerciseId: "ex-pushup",
					reps: 8,
					seconds: null,
					date: "2026-01-01",
				},
				{
					workoutLogId: "w-jan5",
					exerciseId: "ex-pushup",
					reps: 8,
					seconds: null,
					date: "2026-01-05",
				},
				{
					workoutLogId: "w-jan5",
					exerciseId: "ex-pushup",
					reps: 8,
					seconds: null,
					date: "2026-01-05",
				},
				{
					workoutLogId: "w-jan12",
					exerciseId: "ex-pushup",
					reps: 10,
					seconds: null,
					date: "2026-01-12",
				},
				{
					workoutLogId: "w-jan12",
					exerciseId: "ex-pushup",
					reps: 10,
					seconds: null,
					date: "2026-01-12",
				},
				{
					workoutLogId: "w-jan12",
					exerciseId: "ex-pushup",
					reps: 10,
					seconds: null,
					date: "2026-01-12",
				},
			],
			experienceLevel: "INTERMEDIATE",
		});

		const node = res.masteryByExerciseId["ex-pushup"];
		expect(node?.status).toBe("mastered");
		expect(node?.highestTier).toBe("SILVER");
		expect(node?.tiers.map((t) => t.tier)).toEqual([
			"BRONZE",
			"SILVER",
			"GOLD",
		]);
		expect(node?.tiers[0]?.achieved).toBe(true);
		expect(node?.tiers[0]?.bestConsecutiveSessions).toBe(2);
		expect(node?.tiers[0]?.currentConsecutiveSessions).toBe(2);
		expect(node?.tiers[1]?.achieved).toBe(true);
		expect(node?.tiers[2]?.achieved).toBe(false);
		expect(res.counts).toEqual({
			mastered: 1,
			ongoing: 0,
			locked: 0,
			bronze: 0,
			silver: 1,
			gold: 0,
		});

		// Only 1 qualifying session for 2-session BRONZE keeps node ongoing at 50%
		const halfWay = evaluateSkillTree({
			exercises,
			setLogs: [
				{
					workoutLogId: "w1",
					exerciseId: "ex-pushup",
					reps: 8,
					seconds: null,
					date: "2026-01-01",
				},
				{
					workoutLogId: "w1",
					exerciseId: "ex-pushup",
					reps: 8,
					seconds: null,
					date: "2026-01-01",
				},
				{
					workoutLogId: "w1",
					exerciseId: "ex-pushup",
					reps: 8,
					seconds: null,
					date: "2026-01-01",
				},
			],
			experienceLevel: "INTERMEDIATE",
		});
		expect(halfWay.masteryByExerciseId["ex-pushup"]?.status).toBe("ongoing");
		expect(halfWay.masteryByExerciseId["ex-pushup"]?.progressPercent).toBe(50);
	});

	it("enforces maxRpe when both benchmark maxRpe and log rpe are present, and allows null rpe", () => {
		const exercises: SkillTreeExerciseInput[] = [
			{
				id: "ex-hold",
				slug: "l-sit",
				name: "L-Sit Hold",
				pattern: "SKILL",
				difficulty: 6,
				measure: "SECONDS",
				progressionNextId: null,
				masteryTargetSets: 3,
				masteryTargetReps: null,
				masteryTargetSeconds: 20,
				masteryBenchmarks: [
					{
						tier: "BRONZE",
						targetSets: 2,
						targetReps: null,
						targetSeconds: 15,
						minConsecutiveSessions: 1,
						maxRpe: 8,
						tempo: null,
						formStandard: "Legs parallel",
						unlocksNext: true,
					},
					{
						tier: "SILVER",
						targetSets: 2,
						targetReps: null,
						targetSeconds: 25,
						minConsecutiveSessions: 1,
						maxRpe: null,
						tempo: null,
						formStandard: "Toes pointed",
						unlocksNext: false,
					},
				],
			},
		];

		// rpe: 9 exceeds maxRpe: 8 for BRONZE, so BRONZE is not achieved
		const tooHard = evaluateSkillTree({
			exercises,
			setLogs: [
				{
					workoutLogId: "w1",
					exerciseId: "ex-hold",
					reps: null,
					seconds: 18,
					rpe: 9,
				},
				{
					workoutLogId: "w1",
					exerciseId: "ex-hold",
					reps: null,
					seconds: 18,
					rpe: 8,
				},
			],
			experienceLevel: "INTERMEDIATE",
		});
		expect(tooHard.masteryByExerciseId["ex-hold"]?.status).toBe("ongoing");
		expect(tooHard.masteryByExerciseId["ex-hold"]?.highestTier).toBe("NONE");
		expect(
			tooHard.masteryByExerciseId["ex-hold"]?.tiers[0]?.bestSetsInSession,
		).toBe(1);

		// rpe: null/omitted passes even when maxRpe: 8, and maxRpe: null allows rpe: 10 on SILVER
		const omittedAndUncapped = evaluateSkillTree({
			exercises,
			setLogs: [
				{
					workoutLogId: "w1",
					exerciseId: "ex-hold",
					reps: null,
					seconds: 26,
					rpe: null,
				},
				{
					workoutLogId: "w1",
					exerciseId: "ex-hold",
					reps: null,
					seconds: 26,
					rpe: 10,
				},
			],
			experienceLevel: "INTERMEDIATE",
		});
		expect(
			omittedAndUncapped.masteryByExerciseId["ex-hold"]?.tiers[0]?.achieved,
		).toBe(false);
		expect(
			omittedAndUncapped.masteryByExerciseId["ex-hold"]?.tiers[1]?.achieved,
		).toBe(true);
		expect(omittedAndUncapped.masteryByExerciseId["ex-hold"]?.highestTier).toBe(
			"SILVER",
		);
	});

	it("evaluates AND/OR convergence gates across PROGRESSION/ALTERNATIVE and cross-pattern PREREQUISITE edges", () => {
		const exercises: SkillTreeExerciseInput[] = [
			{
				id: "elevated-pike",
				slug: "elevated-pike-pushup",
				name: "Elevated Pike Push-up",
				pattern: "PUSH",
				difficulty: 7,
				measure: "REPS",
				progressionNextId: "wall-hspu-neg",
				masteryTargetSets: 3,
				masteryTargetReps: 8,
				masteryTargetSeconds: null,
			},
			{
				id: "alt-pike",
				slug: "box-pike-pushup",
				name: "Box Pike Push-up",
				pattern: "PUSH",
				difficulty: 7,
				measure: "REPS",
				progressionNextId: null,
				masteryTargetSets: 3,
				masteryTargetReps: 8,
				masteryTargetSeconds: null,
			},
			{
				id: "wall-hs",
				slug: "wall-handstand-hold",
				name: "Chest-to-Wall Handstand Hold",
				pattern: "SKILL",
				difficulty: 5,
				measure: "SECONDS",
				progressionNextId: null,
				masteryTargetSets: 3,
				masteryTargetReps: null,
				masteryTargetSeconds: 20,
				masteryBenchmarks: [
					{
						tier: "BRONZE",
						targetSets: 2,
						targetReps: null,
						targetSeconds: 15,
						minConsecutiveSessions: 1,
						maxRpe: null,
						tempo: null,
						formStandard: null,
						unlocksNext: true,
					},
					{
						tier: "SILVER",
						targetSets: 2,
						targetReps: null,
						targetSeconds: 30,
						minConsecutiveSessions: 1,
						maxRpe: null,
						tempo: null,
						formStandard: null,
						unlocksNext: false,
					},
				],
			},
			{
				id: "wall-hspu-neg",
				slug: "wall-hspu-negative",
				name: "Wall Handstand Push-up Negative",
				pattern: "PUSH",
				difficulty: 8,
				measure: "REPS",
				progressionNextId: null,
				masteryTargetSets: 3,
				masteryTargetReps: 5,
				masteryTargetSeconds: null,
			},
		];

		const edges: SkillTreeEdgeInput[] = [
			{
				id: "e1",
				fromExerciseId: "elevated-pike",
				toExerciseId: "wall-hspu-neg",
				kind: "PROGRESSION",
				branchLabel: "HSPU",
				requiredTier: "BRONZE",
				order: 0,
			},
			{
				id: "e2",
				fromExerciseId: "alt-pike",
				toExerciseId: "wall-hspu-neg",
				kind: "ALTERNATIVE",
				branchLabel: "HSPU Alt",
				requiredTier: "BRONZE",
				order: 1,
			},
			{
				id: "e3",
				fromExerciseId: "wall-hs",
				toExerciseId: "wall-hspu-neg",
				kind: "PREREQUISITE",
				branchLabel: "Balance Gate",
				requiredTier: "SILVER",
				order: 2,
			},
		];

		// Only ALTERNATIVE met + wall-hs at BRONZE (needs SILVER) -> wall-hspu-neg stays locked
		const partial = evaluateSkillTree({
			exercises,
			edges,
			experienceLevel: "INTERMEDIATE",
			setLogs: [
				{ workoutLogId: "w1", exerciseId: "alt-pike", reps: 8, seconds: null },
				{ workoutLogId: "w1", exerciseId: "alt-pike", reps: 8, seconds: null },
				{ workoutLogId: "w1", exerciseId: "alt-pike", reps: 8, seconds: null },
				{ workoutLogId: "w1", exerciseId: "wall-hs", reps: null, seconds: 15 },
				{ workoutLogId: "w1", exerciseId: "wall-hs", reps: null, seconds: 15 },
			],
		});

		const partialTarget = partial.masteryByExerciseId["wall-hspu-neg"];
		expect(partialTarget?.status).toBe("locked");
		expect(partialTarget?.crossPatternPrerequisites).toHaveLength(1);
		expect(partialTarget?.crossPatternPrerequisites[0]?.isCrossPattern).toBe(
			true,
		);
		expect(partialTarget?.crossPatternPrerequisites[0]?.isMet).toBe(false);
		expect(partialTarget?.crossPatternPrerequisites[0]?.currentTier).toBe(
			"BRONZE",
		);
		expect(partialTarget?.crossPatternPrerequisites[0]?.requiredTier).toBe(
			"SILVER",
		);

		// Once wall-hs reaches SILVER, OR gate (alt-pike) + AND gate (wall-hs SILVER) unlocks it!
		const unlocked = evaluateSkillTree({
			exercises,
			edges,
			experienceLevel: "INTERMEDIATE",
			setLogs: [
				{ workoutLogId: "w1", exerciseId: "alt-pike", reps: 8, seconds: null },
				{ workoutLogId: "w1", exerciseId: "alt-pike", reps: 8, seconds: null },
				{ workoutLogId: "w1", exerciseId: "alt-pike", reps: 8, seconds: null },
				{ workoutLogId: "w2", exerciseId: "wall-hs", reps: null, seconds: 30 },
				{ workoutLogId: "w2", exerciseId: "wall-hs", reps: null, seconds: 30 },
			],
		});

		const unlockedTarget = unlocked.masteryByExerciseId["wall-hspu-neg"];
		expect(unlockedTarget?.status).toBe("ongoing");
		expect(unlockedTarget?.crossPatternPrerequisites[0]?.isMet).toBe(true);
		expect(
			unlocked.masteryByExerciseId["wall-hs"]?.outgoingUnlocks[0]?.isMet,
		).toBe(true);
	});

	it("backward propagates only BRONZE along PROGRESSION edges, never SILVER/GOLD, and never across PREREQUISITE/ALTERNATIVE", () => {
		const exercises: SkillTreeExerciseInput[] = [
			{
				...CHAIN[0],
				id: "root-prog",
				masteryBenchmarks: [
					{
						tier: "BRONZE",
						targetSets: 3,
						targetReps: 10,
						targetSeconds: null,
						minConsecutiveSessions: 1,
						maxRpe: null,
						tempo: null,
						formStandard: null,
						unlocksNext: true,
					},
					{
						tier: "SILVER",
						targetSets: 3,
						targetReps: 15,
						targetSeconds: null,
						minConsecutiveSessions: 1,
						maxRpe: null,
						tempo: null,
						formStandard: null,
						unlocksNext: false,
					},
				],
			},
			{
				...CHAIN[1],
				id: "alt-parent",
				progressionNextId: null,
			},
			{
				...CHAIN[1],
				id: "prereq-parent",
				pattern: "CORE",
				progressionNextId: null,
			},
			{
				...CHAIN[2],
				id: "apex",
				masteryBenchmarks: [
					{
						tier: "BRONZE",
						targetSets: 2,
						targetReps: 8,
						targetSeconds: null,
						minConsecutiveSessions: 1,
						maxRpe: null,
						tempo: null,
						formStandard: null,
						unlocksNext: true,
					},
					{
						tier: "GOLD",
						targetSets: 2,
						targetReps: 12,
						targetSeconds: null,
						minConsecutiveSessions: 1,
						maxRpe: null,
						tempo: null,
						formStandard: null,
						unlocksNext: false,
					},
				],
			},
		];

		const edges: SkillTreeEdgeInput[] = [
			{
				id: "p1",
				fromExerciseId: "root-prog",
				toExerciseId: "apex",
				kind: "PROGRESSION",
				branchLabel: null,
				requiredTier: "BRONZE",
				order: 0,
			},
			{
				id: "a1",
				fromExerciseId: "alt-parent",
				toExerciseId: "apex",
				kind: "ALTERNATIVE",
				branchLabel: null,
				requiredTier: "BRONZE",
				order: 1,
			},
			{
				id: "r1",
				fromExerciseId: "prereq-parent",
				toExerciseId: "apex",
				kind: "PREREQUISITE",
				branchLabel: null,
				requiredTier: "BRONZE",
				order: 2,
			},
		];

		const res = evaluateSkillTree({
			exercises,
			edges,
			experienceLevel: "ADVANCED",
			setLogs: [
				{ workoutLogId: "w1", exerciseId: "apex", reps: 12, seconds: null },
				{ workoutLogId: "w1", exerciseId: "apex", reps: 12, seconds: null },
			],
		});

		expect(res.masteryByExerciseId.apex?.highestTier).toBe("GOLD");

		// PROGRESSION ancestor gets BRONZE implied only (never SILVER/GOLD)
		const rootProg = res.masteryByExerciseId["root-prog"];
		expect(rootProg?.status).toBe("mastered");
		expect(rootProg?.highestTier).toBe("BRONZE");
		expect(rootProg?.impliedByProgression).toBe(true);
		expect(rootProg?.tiers[0]).toMatchObject({
			tier: "BRONZE",
			achieved: true,
			implied: true,
			progressPercent: 100,
		});
		expect(rootProg?.tiers[1]).toMatchObject({
			tier: "SILVER",
			achieved: false,
			implied: false,
		});

		// ALTERNATIVE and PREREQUISITE parents are NOT implied
		expect(res.masteryByExerciseId["alt-parent"]?.highestTier).toBe("NONE");
		expect(res.masteryByExerciseId["alt-parent"]?.impliedByProgression).toBe(
			false,
		);
		expect(res.masteryByExerciseId["prereq-parent"]?.highestTier).toBe("NONE");
		expect(res.masteryByExerciseId["prereq-parent"]?.impliedByProgression).toBe(
			false,
		);
	});

	it("marks locked nodes ongoing when sets are logged and handles cyclic PROGRESSION edges safely", () => {
		const exercises: SkillTreeExerciseInput[] = [
			{
				...CHAIN[0],
				id: "node-a",
				progressionNextId: "node-b",
			},
			{
				...CHAIN[1],
				id: "node-b",
				progressionNextId: "node-a",
			},
		];

		const res = evaluateSkillTree({
			exercises,
			edges: [
				{
					id: "ab",
					fromExerciseId: "node-a",
					toExerciseId: "node-b",
					kind: "PROGRESSION",
					branchLabel: null,
					requiredTier: "BRONZE",
					order: 0,
				},
				{
					id: "ba",
					fromExerciseId: "node-b",
					toExerciseId: "node-a",
					kind: "PROGRESSION",
					branchLabel: null,
					requiredTier: "BRONZE",
					order: 0,
				},
			],
			setLogs: [
				{ workoutLogId: "w1", exerciseId: "node-b", reps: 10, seconds: null },
				{ workoutLogId: "w1", exerciseId: "node-b", reps: 10, seconds: null },
				{ workoutLogId: "w1", exerciseId: "node-b", reps: 10, seconds: null },
				// Single insufficient set on node-a still keeps node-a ongoing via totalSetsLogged > 0 if not mastered
			],
			experienceLevel: "INTERMEDIATE",
		});

		expect(res.masteryByExerciseId["node-b"]?.status).toBe("mastered");
		expect(res.masteryByExerciseId["node-a"]?.status).toBe("mastered");
		expect(res.masteryByExerciseId["node-a"]?.impliedByProgression).toBe(true);

		// Also verify totalSetsLogged > 0 overrides locked status when prerequisite is unmet
		const lockedGateEx: SkillTreeExerciseInput[] = [
			{ ...CHAIN[0], id: "parent", progressionNextId: "child" },
			{ ...CHAIN[1], id: "child", progressionNextId: null },
		];
		const loggedLocked = evaluateSkillTree({
			exercises: lockedGateEx,
			setLogs: [
				{ workoutLogId: "w1", exerciseId: "child", reps: 2, seconds: null },
			],
			experienceLevel: "BEGINNER",
		});
		expect(loggedLocked.masteryByExerciseId.child?.status).toBe("ongoing");
		expect(loggedLocked.masteryByExerciseId.child?.totalSetsLogged).toBe(1);
	});
});
