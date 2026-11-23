import type { MovementPattern } from "@/lib/exercises/eligibility";
import { computeTopologicalTiers } from "@/lib/exercises/progression-dag";
import type {
	MasteryTierAchieved,
	MasteryTierValue,
	ProgressionEdgeKindValue,
	SkillEdgeRequirement,
	SkillNodeProgress,
	SkillTreeEdgeInput,
} from "./skill-tree";

export const NODE_W = 148;
export const NODE_H = 74;
export const COL_GAP = 32;
export const ROW_GAP = 64;
export const PAD_X = 48;
export const PAD_Y = 56;

export type LayoutExerciseInput = {
	id: string;
	name: string;
	pattern: MovementPattern;
	difficulty: number;
	measure?: "REPS" | "SECONDS";
	branchKey?: string | null;
	treeTier?: number;
};

export type LayoutNode<T extends LayoutExerciseInput = LayoutExerciseInput> = {
	exercise: T;
	mastery: SkillNodeProgress;
	tier: number;
	column: number;
	x: number;
	y: number;
	width: number;
	height: number;
	crossPatternPortals: SkillEdgeRequirement[];
};

export type LayoutEdge = {
	id: string;
	fromId: string;
	toId: string;
	kind: ProgressionEdgeKindValue;
	branchLabel: string | null;
	requiredTier: MasteryTierValue;
	isMet: boolean;
	pathD: string;
};

export type SkillTreeCanvasLayout<
	T extends LayoutExerciseInput = LayoutExerciseInput,
> = {
	pattern: MovementPattern;
	width: number;
	height: number;
	maxTier: number;
	nodes: LayoutNode<T>[];
	nodesByTier: { tier: number; nodes: LayoutNode<T>[] }[];
	edges: LayoutEdge[];
};

const TIER_RANK: Record<MasteryTierAchieved, number> = {
	NONE: 0,
	BRONZE: 1,
	SILVER: 2,
	GOLD: 3,
};

function createFallbackMastery(ex: LayoutExerciseInput): SkillNodeProgress {
	return {
		exerciseId: ex.id,
		status: "locked",
		highestTier: "NONE",
		impliedByProgression: false,
		tiers: [],
		bestSetsInSession: 0,
		targetSets: 3,
		targetValue: ex.measure === "SECONDS" ? 20 : 8,
		measure: ex.measure ?? "REPS",
		totalSetsLogged: 0,
		progressPercent: 0,
		incomingRequirements: [],
		outgoingUnlocks: [],
		crossPatternPrerequisites: [],
	};
}

export function computeBottomUpDagLayout<
	T extends LayoutExerciseInput,
>(params: {
	pattern: MovementPattern;
	exercises: readonly T[];
	edges: readonly SkillTreeEdgeInput[];
	masteryByExerciseId: Record<string, SkillNodeProgress>;
}): SkillTreeCanvasLayout<T> {
	const { pattern, exercises, edges, masteryByExerciseId } = params;
	const patternExercises = exercises.filter((ex) => ex.pattern === pattern);

	if (patternExercises.length === 0) {
		return {
			pattern,
			width: PAD_X * 2 + NODE_W,
			height: PAD_Y * 2 + NODE_H,
			maxTier: 0,
			nodes: [],
			nodesByTier: [],
			edges: [],
		};
	}

	const nodeIds = new Set(patternExercises.map((ex) => ex.id));
	const intraEdges = edges.filter(
		(edge) =>
			edge.fromExerciseId !== edge.toExerciseId &&
			nodeIds.has(edge.fromExerciseId) &&
			nodeIds.has(edge.toExerciseId),
	);

	const tiersMap = computeTopologicalTiers(
		patternExercises.map((ex) => ex.id),
		intraEdges.map((edge) => ({
			fromId: edge.fromExerciseId,
			toId: edge.toExerciseId,
		})),
	);

	// Ensure tier(to) > tier(from) for all intra-pattern edges (cycle-safe bound)
	const maxPossibleTier = patternExercises.length;
	for (let pass = 0; pass < maxPossibleTier; pass += 1) {
		let changed = false;
		for (const edge of intraEdges) {
			const fromTier = tiersMap.get(edge.fromExerciseId) ?? 1;
			const toTier = tiersMap.get(edge.toExerciseId) ?? 1;
			if (toTier <= fromTier && fromTier + 1 <= maxPossibleTier) {
				tiersMap.set(edge.toExerciseId, fromTier + 1);
				changed = true;
			}
		}
		if (!changed) break;
	}

	const exercisesByTier = new Map<number, T[]>();
	let maxTier = 1;
	for (const ex of patternExercises) {
		const tier = tiersMap.get(ex.id) ?? 1;
		if (tier > maxTier) maxTier = tier;
		const bucket = exercisesByTier.get(tier) ?? [];
		bucket.push(ex);
		exercisesByTier.set(tier, bucket);
	}

	let maxCols = 1;
	for (const bucket of exercisesByTier.values()) {
		if (bucket.length > maxCols) maxCols = bucket.length;
	}

	const width =
		PAD_X * 2 + maxCols * NODE_W + Math.max(0, maxCols - 1) * COL_GAP;
	const height =
		PAD_Y * 2 + maxTier * NODE_H + Math.max(0, maxTier - 1) * ROW_GAP;

	// Track intra-pattern parent IDs for barycenter ordering
	const intraParentsById = new Map<string, string[]>();
	for (const ex of patternExercises) {
		intraParentsById.set(ex.id, []);
	}
	for (const edge of intraEdges) {
		intraParentsById.get(edge.toExerciseId)?.push(edge.fromExerciseId);
	}

	const placedXById = new Map<string, number>();
	const layoutNodeById = new Map<string, LayoutNode<T>>();
	const nodes: LayoutNode<T>[] = [];
	const nodesByTier: { tier: number; nodes: LayoutNode<T>[] }[] = [];

	for (let tier = 1; tier <= maxTier; tier += 1) {
		const tierBucket = exercisesByTier.get(tier);
		if (!tierBucket || tierBucket.length === 0) continue;

		const barycenterById = new Map<string, number>();
		for (const ex of tierBucket) {
			const parentXs = (intraParentsById.get(ex.id) ?? [])
				.map((pid) => placedXById.get(pid))
				.filter((val): val is number => val !== undefined);

			if (parentXs.length > 0) {
				const sum = parentXs.reduce((acc, x) => acc + x, 0);
				barycenterById.set(ex.id, sum / parentXs.length);
			} else {
				barycenterById.set(ex.id, width / 2);
			}
		}

		const sorted = [...tierBucket].sort((a, b) => {
			const aBary = barycenterById.get(a.id) ?? width / 2;
			const bBary = barycenterById.get(b.id) ?? width / 2;
			if (Math.abs(aBary - bBary) > 1e-6) {
				return aBary - bBary;
			}

			const aBranch = a.branchKey ?? "";
			const bBranch = b.branchKey ?? "";
			if (aBranch !== bBranch) {
				if (aBranch === "") return 1;
				if (bBranch === "") return -1;
				const branchCmp = aBranch.localeCompare(bBranch);
				if (branchCmp !== 0) return branchCmp;
			}

			if (a.difficulty !== b.difficulty) {
				return a.difficulty - b.difficulty;
			}

			const nameCmp = a.name.localeCompare(b.name);
			if (nameCmp !== 0) return nameCmp;

			return a.id.localeCompare(b.id);
		});

		const tierCount = sorted.length;
		const tierWidth = tierCount * NODE_W + Math.max(0, tierCount - 1) * COL_GAP;
		const startX = (width - tierWidth) / 2;
		const y = PAD_Y + (maxTier - tier) * (NODE_H + ROW_GAP) + NODE_H / 2;

		const tierNodes: LayoutNode<T>[] = [];
		for (let col = 0; col < tierCount; col += 1) {
			const ex = sorted[col];
			const x = startX + col * (NODE_W + COL_GAP) + NODE_W / 2;
			const mastery = masteryByExerciseId[ex.id] ?? createFallbackMastery(ex);
			const layoutNode: LayoutNode<T> = {
				exercise: ex,
				mastery,
				tier,
				column: col,
				x,
				y,
				width: NODE_W,
				height: NODE_H,
				crossPatternPortals: mastery.crossPatternPrerequisites ?? [],
			};
			placedXById.set(ex.id, x);
			layoutNodeById.set(ex.id, layoutNode);
			nodes.push(layoutNode);
			tierNodes.push(layoutNode);
		}

		nodesByTier.push({ tier, nodes: tierNodes });
	}

	const layoutEdges: LayoutEdge[] = [];
	for (const edge of intraEdges) {
		const fromNode = layoutNodeById.get(edge.fromExerciseId);
		const toNode = layoutNodeById.get(edge.toExerciseId);
		if (!fromNode || !toNode) continue;

		const x1 = fromNode.x;
		const y1 = fromNode.y - NODE_H / 2;
		const x2 = toNode.x;
		const y2 = toNode.y + NODE_H / 2;
		const midY = (y1 + y2) / 2;
		const pathD = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

		const fromTier =
			masteryByExerciseId[edge.fromExerciseId]?.highestTier ?? "NONE";
		const isMet = TIER_RANK[fromTier] >= TIER_RANK[edge.requiredTier];

		layoutEdges.push({
			id: edge.id,
			fromId: edge.fromExerciseId,
			toId: edge.toExerciseId,
			kind: edge.kind,
			branchLabel: edge.branchLabel,
			requiredTier: edge.requiredTier,
			isMet,
			pathD,
		});
	}

	return {
		pattern,
		width,
		height,
		maxTier,
		nodes,
		nodesByTier,
		edges: layoutEdges,
	};
}
