import { describe, expect, it } from "vitest";
import { MOVEMENT_PATTERNS } from "@/lib/exercises/eligibility";
import { inferDefaultMusclesAndMastery } from "@/lib/exercises/muscles";
import { SEED_EDGES, SEED_EXERCISES } from "../../../prisma/seed-data";
import {
	evaluateSkillTree,
	type SkillTreeEdgeInput,
	type SkillTreeExerciseInput,
} from "./skill-tree";
import {
	computeBottomUpDagLayout,
	NODE_H,
	NODE_W,
	PAD_Y,
} from "./skill-tree-layout";

function buildSeedCatalog(): {
	exercises: SkillTreeExerciseInput[];
	edges: SkillTreeEdgeInput[];
} {
	const exercises: SkillTreeExerciseInput[] = SEED_EXERCISES.map((ex) => {
		const defaults = inferDefaultMusclesAndMastery(ex);
		return {
			id: ex.slug,
			slug: ex.slug,
			name: ex.name,
			pattern: ex.pattern,
			difficulty: ex.difficulty,
			measure: ex.measure,
			progressionNextId: ex.nextSlug ?? null,
			masteryTargetSets: defaults.masteryTargetSets,
			masteryTargetReps: defaults.masteryTargetReps,
			masteryTargetSeconds: defaults.masteryTargetSeconds,
			branchKey: ex.branchKey,
			masteryBenchmarks: defaults.masteryBenchmarks.map((b) => ({
				tier: b.tier,
				targetSets: b.targetSets,
				targetReps: b.targetReps ?? null,
				targetSeconds: b.targetSeconds ?? null,
				minConsecutiveSessions: b.minConsecutiveSessions ?? 1,
				maxRpe: b.maxRpe ?? null,
				tempo: b.tempo ?? null,
				formStandard: b.formStandard ?? null,
				unlocksNext: b.unlocksNext ?? false,
			})),
		};
	});

	const edges: SkillTreeEdgeInput[] = SEED_EDGES.map((edge, idx) => ({
		id: `edge-${idx}-${edge.fromSlug}-${edge.toSlug}`,
		fromExerciseId: edge.fromSlug,
		toExerciseId: edge.toSlug,
		kind: edge.kind,
		branchLabel: edge.branchLabel ?? null,
		requiredTier: edge.requiredTier,
		order: edge.order,
	}));

	return { exercises, edges };
}

describe("computeBottomUpDagLayout", () => {
	it("lays out all 116 seed exercises and 121 edges across every pattern with zero overlaps, single-path T1-T3 foundations, and bottom-up hierarchy", () => {
		const { exercises, edges } = buildSeedCatalog();
		expect(exercises).toHaveLength(116);
		expect(edges).toHaveLength(121);

		const evaluation = evaluateSkillTree({
			exercises,
			setLogs: [],
			experienceLevel: "INTERMEDIATE",
			edges,
		});

		let totalLaidOutNodes = 0;

		for (const pattern of MOVEMENT_PATTERNS) {
			const expectedPatternNodes = exercises.filter(
				(ex) => ex.pattern === pattern,
			);
			const layout = computeBottomUpDagLayout({
				pattern,
				exercises,
				edges: evaluation.edges,
				masteryByExerciseId: evaluation.masteryByExerciseId,
			});

			expect(layout.pattern).toBe(pattern);
			expect(layout.nodes).toHaveLength(expectedPatternNodes.length);
			totalLaidOutNodes += layout.nodes.length;

			const nodeById = new Map(layout.nodes.map((n) => [n.exercise.id, n]));

			// Verify no identical (x, y) coordinates and no bounding-box overlaps
			const seenCoords = new Set<string>();
			for (let i = 0; i < layout.nodes.length; i += 1) {
				const a = layout.nodes[i];
				const coordKey = `${a.x},${a.y}`;
				expect(seenCoords.has(coordKey)).toBe(false);
				seenCoords.add(coordKey);
				expect(a.width).toBe(NODE_W);
				expect(a.height).toBe(NODE_H);

				for (let j = i + 1; j < layout.nodes.length; j += 1) {
					const b = layout.nodes[j];
					const overlapsX = Math.abs(a.x - b.x) < NODE_W;
					const overlapsY = Math.abs(a.y - b.y) < NODE_H;
					expect(overlapsX && overlapsY).toBe(false);
				}
			}

			// Verify bottom-up Y placement: Tier 1 at bottom, maxTier at top
			const topNodes = layout.nodes.filter((n) => n.tier === layout.maxTier);
			for (const topNode of topNodes) {
				expect(topNode.y).toBe(PAD_Y + NODE_H / 2);
			}
			for (const tierGroup of layout.nodesByTier) {
				for (const node of tierGroup.nodes) {
					expect(node.tier).toBe(tierGroup.tier);
				}
			}

			// Every pattern starts with a clean single-path 3-tier ultra-beginner foundation (T1 -> T2 -> T3)
			for (const foundationTier of [1, 2, 3]) {
				const tierRow = layout.nodesByTier.find(
					(g) => g.tier === foundationTier,
				);
				expect(tierRow?.nodes).toHaveLength(1);
				expect(tierRow?.nodes[0]?.exercise.difficulty).toBe(1);
			}

			// Verify strictly parent.y > child.y and valid cubic Bezier pathD for all intra-pattern edges
			for (const edge of layout.edges) {
				const parent = nodeById.get(edge.fromId);
				const child = nodeById.get(edge.toId);
				expect(parent).toBeDefined();
				expect(child).toBeDefined();
				if (parent && child) {
					expect(parent.y).toBeGreaterThan(child.y);
					expect(child.tier).toBeGreaterThan(parent.tier);
					expect(edge.pathD).toContain(
						`M ${parent.x} ${parent.y - NODE_H / 2}`,
					);
					expect(edge.pathD).toContain(`${child.x} ${child.y + NODE_H / 2}`);
				}
			}
		}

		expect(totalLaidOutNodes).toBe(116);
	});

	it("attaches crossPatternPortals on bar-muscle-up and wall-hspu-negative", () => {
		const { exercises, edges } = buildSeedCatalog();
		const evaluation = evaluateSkillTree({
			exercises,
			setLogs: [],
			experienceLevel: "INTERMEDIATE",
			edges,
		});

		const skillLayout = computeBottomUpDagLayout({
			pattern: "SKILL",
			exercises,
			edges: evaluation.edges,
			masteryByExerciseId: evaluation.masteryByExerciseId,
		});
		const barMuscleUpNode = skillLayout.nodes.find(
			(n) => n.exercise.slug === "bar-muscle-up",
		);
		expect(barMuscleUpNode).toBeDefined();
		expect(
			barMuscleUpNode?.crossPatternPortals.map((p) => p.exerciseId).sort(),
		).toEqual(["banded-muscle-up", "parallel-bar-dip"]);

		const pushLayout = computeBottomUpDagLayout({
			pattern: "PUSH",
			exercises,
			edges: evaluation.edges,
			masteryByExerciseId: evaluation.masteryByExerciseId,
		});
		const wallHspuNegNode = pushLayout.nodes.find(
			(n) => n.exercise.slug === "wall-hspu-negative",
		);
		expect(wallHspuNegNode).toBeDefined();
		expect(
			wallHspuNegNode?.crossPatternPortals.map((p) => p.exerciseId),
		).toEqual(["wall-handstand-hold"]);
	});

	it("handles empty pattern exercise lists gracefully", () => {
		const layout = computeBottomUpDagLayout({
			pattern: "MOBILITY",
			exercises: [],
			edges: [],
			masteryByExerciseId: {},
		});

		expect(layout.maxTier).toBe(0);
		expect(layout.nodes).toEqual([]);
		expect(layout.nodesByTier).toEqual([]);
		expect(layout.edges).toEqual([]);
	});

	it("centers narrow tiers horizontally and enforces vertical Bezier endpoints", () => {
		const exercises: SkillTreeExerciseInput[] = [
			{
				id: "r1",
				slug: "r1",
				name: "Root 1",
				pattern: "PUSH",
				difficulty: 1,
				measure: "REPS",
				progressionNextId: "c1",
				masteryTargetSets: 3,
				masteryTargetReps: 10,
				masteryTargetSeconds: null,
				branchKey: "a",
			},
			{
				id: "r2",
				slug: "r2",
				name: "Root 2",
				pattern: "PUSH",
				difficulty: 1,
				measure: "REPS",
				progressionNextId: "c1",
				masteryTargetSets: 3,
				masteryTargetReps: 10,
				masteryTargetSeconds: null,
				branchKey: "b",
			},
			{
				id: "c1",
				slug: "c1",
				name: "Converge",
				pattern: "PUSH",
				difficulty: 3,
				measure: "REPS",
				progressionNextId: null,
				masteryTargetSets: 3,
				masteryTargetReps: 8,
				masteryTargetSeconds: null,
				branchKey: "a",
			},
		];

		const edges: SkillTreeEdgeInput[] = [
			{
				id: "e1",
				fromExerciseId: "r1",
				toExerciseId: "c1",
				kind: "PROGRESSION",
				branchLabel: null,
				requiredTier: "BRONZE",
				order: 0,
			},
			{
				id: "e2",
				fromExerciseId: "r2",
				toExerciseId: "c1",
				kind: "PREREQUISITE",
				branchLabel: null,
				requiredTier: "BRONZE",
				order: 1,
			},
		];

		const evalRes = evaluateSkillTree({
			exercises,
			setLogs: [],
			experienceLevel: "BEGINNER",
			edges,
		});

		const layout = computeBottomUpDagLayout({
			pattern: "PUSH",
			exercises,
			edges: evalRes.edges,
			masteryByExerciseId: evalRes.masteryByExerciseId,
		});

		expect(layout.maxTier).toBe(2);
		const converge = layout.nodes.find((n) => n.exercise.id === "c1");
		expect(converge?.x).toBe(layout.width / 2);
		expect(converge?.y).toBe(PAD_Y + NODE_H / 2);
	});
});
