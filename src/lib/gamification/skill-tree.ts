import type {
	ExperienceLevel,
	MovementPattern,
} from "@/lib/exercises/eligibility";
import { MOVEMENT_PATTERNS } from "@/lib/exercises/eligibility";

export type SkillNodeStatus = "mastered" | "ongoing" | "locked";

export type MasteryTierValue = "BRONZE" | "SILVER" | "GOLD";

export type MasteryTierAchieved = "NONE" | MasteryTierValue;

export type ProgressionEdgeKindValue =
	| "PROGRESSION"
	| "PREREQUISITE"
	| "ALTERNATIVE";

export type SkillTreeBenchmarkInput = {
	tier: MasteryTierValue;
	targetSets: number;
	targetReps: number | null;
	targetSeconds: number | null;
	minConsecutiveSessions: number;
	maxRpe: number | null;
	tempo: string | null;
	formStandard: string | null;
	unlocksNext: boolean;
};

export type SkillTreeEdgeInput = {
	id: string;
	fromExerciseId: string;
	toExerciseId: string;
	kind: ProgressionEdgeKindValue;
	branchLabel: string | null;
	requiredTier: MasteryTierValue;
	order: number;
};

export type SkillTreeExerciseInput = {
	id: string;
	slug: string;
	name: string;
	pattern: MovementPattern;
	difficulty: number;
	measure: "REPS" | "SECONDS";
	progressionNextId: string | null;
	masteryTargetSets: number;
	masteryTargetReps: number | null;
	masteryTargetSeconds: number | null;
	branchKey?: string | null;
	treeTier?: number;
	masteryBenchmarks?: readonly SkillTreeBenchmarkInput[];
};

export type SkillTreeSetLogInput = {
	workoutLogId: string;
	exerciseId: string;
	reps: number | null;
	seconds: number | null;
	rpe?: number | null;
	date?: string;
};

export type TierProgressItem = {
	tier: MasteryTierValue;
	achieved: boolean;
	implied: boolean;
	targetSets: number;
	targetValue: number;
	measure: "REPS" | "SECONDS";
	minConsecutiveSessions: number;
	currentConsecutiveSessions: number;
	bestConsecutiveSessions: number;
	bestSetsInSession: number;
	maxRpe: number | null;
	tempo: string | null;
	formStandard: string | null;
	progressPercent: number;
};

export type SkillEdgeRequirement = {
	edgeId: string;
	exerciseId: string;
	exerciseName: string;
	exercisePattern: MovementPattern;
	kind: ProgressionEdgeKindValue;
	branchLabel: string | null;
	requiredTier: MasteryTierValue;
	currentTier: MasteryTierAchieved;
	isMet: boolean;
	isCrossPattern: boolean;
};

export type SkillNodeProgress = {
	exerciseId: string;
	status: SkillNodeStatus;
	highestTier: MasteryTierAchieved;
	impliedByProgression: boolean;
	tiers: TierProgressItem[];
	bestSetsInSession: number;
	targetSets: number;
	targetValue: number;
	measure: "REPS" | "SECONDS";
	totalSetsLogged: number;
	progressPercent: number;
	incomingRequirements: SkillEdgeRequirement[];
	outgoingUnlocks: SkillEdgeRequirement[];
	crossPatternPrerequisites: SkillEdgeRequirement[];
};

export type SkillTreeBranch<T extends SkillTreeExerciseInput> = {
	rootId: string;
	nodes: (T & { mastery: SkillNodeProgress })[];
};

export type SkillTreeEvaluation<T extends SkillTreeExerciseInput> = {
	masteryByExerciseId: Record<string, SkillNodeProgress>;
	branchesByPattern: Record<MovementPattern, SkillTreeBranch<T>[]>;
	edges: SkillTreeEdgeInput[];
	counts: {
		mastered: number;
		ongoing: number;
		locked: number;
		bronze: number;
		silver: number;
		gold: number;
	};
};

type SessionBucket = {
	workoutLogId: string;
	date?: string;
	firstIndex: number;
	logs: SkillTreeSetLogInput[];
};

const TIER_ORDER: Record<MasteryTierValue, number> = {
	BRONZE: 1,
	SILVER: 2,
	GOLD: 3,
};

const TIER_RANK: Record<MasteryTierAchieved, number> = {
	NONE: 0,
	BRONZE: 1,
	SILVER: 2,
	GOLD: 3,
};

function getLegacyTargetValue(ex: SkillTreeExerciseInput): number {
	if (ex.measure === "SECONDS") {
		return ex.masteryTargetSeconds ?? 20;
	}
	return ex.masteryTargetReps ?? 8;
}

function resolveBenchmarks(
	ex: SkillTreeExerciseInput,
): SkillTreeBenchmarkInput[] {
	if (ex.masteryBenchmarks && ex.masteryBenchmarks.length > 0) {
		return [...ex.masteryBenchmarks].sort(
			(a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier],
		);
	}
	return [
		{
			tier: "BRONZE",
			targetSets: Math.max(1, ex.masteryTargetSets || 3),
			targetReps: ex.measure === "REPS" ? (ex.masteryTargetReps ?? 8) : null,
			targetSeconds:
				ex.measure === "SECONDS" ? (ex.masteryTargetSeconds ?? 20) : null,
			minConsecutiveSessions: 1,
			maxRpe: null,
			tempo: null,
			formStandard: null,
			unlocksNext: true,
		},
	];
}

function evaluateTierProgress(
	ex: SkillTreeExerciseInput,
	benchmark: SkillTreeBenchmarkInput,
	sessions: readonly SessionBucket[],
): TierProgressItem {
	const targetSets = Math.max(1, benchmark.targetSets || 3);
	const targetValue =
		ex.measure === "SECONDS"
			? (benchmark.targetSeconds ?? ex.masteryTargetSeconds ?? 20)
			: (benchmark.targetReps ?? ex.masteryTargetReps ?? 8);
	const minConsecutiveSessions = Math.max(
		1,
		benchmark.minConsecutiveSessions || 1,
	);
	const maxRpe = benchmark.maxRpe ?? null;

	let bestSetsInSession = 0;
	let bestConsecutiveSessions = 0;
	let run = 0;

	for (const session of sessions) {
		let qualifyingSets = 0;
		for (const log of session.logs) {
			const actualVal =
				ex.measure === "SECONDS" ? (log.seconds ?? 0) : (log.reps ?? 0);
			const meetsTarget = actualVal >= targetValue;
			const meetsRpe = maxRpe == null || log.rpe == null || log.rpe <= maxRpe;
			if (meetsTarget && meetsRpe) {
				qualifyingSets += 1;
			}
		}

		if (qualifyingSets > bestSetsInSession) {
			bestSetsInSession = qualifyingSets;
		}

		if (qualifyingSets >= targetSets) {
			run += 1;
			if (run > bestConsecutiveSessions) {
				bestConsecutiveSessions = run;
			}
		} else {
			run = 0;
		}
	}

	const currentConsecutiveSessions = run;
	const achieved = bestConsecutiveSessions >= minConsecutiveSessions;

	let progressPercent: number;
	if (achieved) {
		progressPercent = 100;
	} else if (minConsecutiveSessions <= 1) {
		progressPercent = Math.min(
			99,
			Math.round((bestSetsInSession / targetSets) * 100),
		);
	} else {
		const sessionFraction =
			currentConsecutiveSessions > 0
				? currentConsecutiveSessions / minConsecutiveSessions
				: Math.min(0.99, bestSetsInSession / targetSets) /
					minConsecutiveSessions;
		progressPercent = Math.min(99, Math.round(sessionFraction * 100));
	}

	return {
		tier: benchmark.tier,
		achieved,
		implied: false,
		targetSets,
		targetValue,
		measure: ex.measure,
		minConsecutiveSessions,
		currentConsecutiveSessions,
		bestConsecutiveSessions,
		bestSetsInSession,
		maxRpe,
		tempo: benchmark.tempo ?? null,
		formStandard: benchmark.formStandard ?? null,
		progressPercent,
	};
}

function getDirectHighestTier(
	tiers: readonly TierProgressItem[],
): MasteryTierAchieved {
	if (tiers.some((t) => t.tier === "GOLD" && t.achieved)) return "GOLD";
	if (tiers.some((t) => t.tier === "SILVER" && t.achieved)) return "SILVER";
	if (tiers.some((t) => t.tier === "BRONZE" && t.achieved)) return "BRONZE";
	return "NONE";
}

export function evaluateSkillTree<T extends SkillTreeExerciseInput>(params: {
	exercises: readonly T[];
	setLogs: readonly SkillTreeSetLogInput[];
	experienceLevel: ExperienceLevel;
	edges?: readonly SkillTreeEdgeInput[];
}): SkillTreeEvaluation<T> {
	const { exercises, setLogs } = params;
	const byId = new Map(exercises.map((ex) => [ex.id, ex]));

	// 1. Resolve DAG edges (or synthesize PROGRESSION edges from legacy progressionNextId)
	const resolvedEdges: SkillTreeEdgeInput[] =
		params.edges && params.edges.length > 0
			? params.edges
					.filter(
						(edge) =>
							edge.fromExerciseId !== edge.toExerciseId &&
							byId.has(edge.fromExerciseId) &&
							byId.has(edge.toExerciseId),
					)
					.map((edge) => ({ ...edge }))
					.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
			: exercises
					.filter(
						(ex): ex is T & { progressionNextId: string } =>
							Boolean(ex.progressionNextId) &&
							ex.progressionNextId !== ex.id &&
							byId.has(ex.progressionNextId ?? ""),
					)
					.map((ex) => ({
						id: `synth-${ex.id}-${ex.progressionNextId}`,
						fromExerciseId: ex.id,
						toExerciseId: ex.progressionNextId,
						kind: "PROGRESSION" as const,
						branchLabel: null,
						requiredTier: "BRONZE" as const,
						order: 0,
					}));

	// 2. Group setLogs per exercise by workoutLogId in chronological order
	const sessionsByExercise = new Map<string, SessionBucket[]>();
	const sessionMapByExercise = new Map<string, Map<string, SessionBucket>>();
	const totalSetsByExercise = new Map<string, number>();

	for (let i = 0; i < setLogs.length; i += 1) {
		const log = setLogs[i];
		if (!log || !byId.has(log.exerciseId)) continue;

		totalSetsByExercise.set(
			log.exerciseId,
			(totalSetsByExercise.get(log.exerciseId) ?? 0) + 1,
		);

		let exSessionMap = sessionMapByExercise.get(log.exerciseId);
		let exSessions = sessionsByExercise.get(log.exerciseId);
		if (!exSessionMap || !exSessions) {
			exSessionMap = new Map<string, SessionBucket>();
			exSessions = [];
			sessionMapByExercise.set(log.exerciseId, exSessionMap);
			sessionsByExercise.set(log.exerciseId, exSessions);
		}

		let bucket = exSessionMap.get(log.workoutLogId);
		if (!bucket) {
			bucket = {
				workoutLogId: log.workoutLogId,
				date: log.date,
				firstIndex: i,
				logs: [],
			};
			exSessionMap.set(log.workoutLogId, bucket);
			exSessions.push(bucket);
		} else if (bucket.date === undefined && log.date !== undefined) {
			bucket.date = log.date;
		}

		bucket.logs.push(log);
	}

	for (const exSessions of sessionsByExercise.values()) {
		exSessions.sort((a, b) => {
			if (a.date !== undefined && b.date !== undefined && a.date !== b.date) {
				return a.date < b.date ? -1 : 1;
			}
			return a.firstIndex - b.firstIndex;
		});
	}

	// 3. Evaluate direct tier mastery per exercise
	const directTiersById = new Map<string, TierProgressItem[]>();
	const highestTierById = new Map<string, MasteryTierAchieved>();

	for (const ex of exercises) {
		const benchmarks = resolveBenchmarks(ex);
		const sessions = sessionsByExercise.get(ex.id) ?? [];
		const tiers = benchmarks.map((benchmark) =>
			evaluateTierProgress(ex, benchmark, sessions),
		);
		directTiersById.set(ex.id, tiers);
		highestTierById.set(ex.id, getDirectHighestTier(tiers));
	}

	// 4. Backward propagate BRONZE mastery along incoming PROGRESSION edges (cycle-safe)
	const incomingProgressionParents = new Map<string, string[]>();
	const incomingEdgesByTarget = new Map<string, SkillTreeEdgeInput[]>();
	const outgoingEdgesBySource = new Map<string, SkillTreeEdgeInput[]>();

	for (const ex of exercises) {
		incomingProgressionParents.set(ex.id, []);
		incomingEdgesByTarget.set(ex.id, []);
		outgoingEdgesBySource.set(ex.id, []);
	}

	for (const edge of resolvedEdges) {
		incomingEdgesByTarget.get(edge.toExerciseId)?.push(edge);
		outgoingEdgesBySource.get(edge.fromExerciseId)?.push(edge);
		if (edge.kind === "PROGRESSION") {
			incomingProgressionParents
				.get(edge.toExerciseId)
				?.push(edge.fromExerciseId);
		}
	}

	const impliedIds = new Set<string>();
	const visitedPropagate = new Set<string>();
	const propagateQueue: string[] = [];

	for (const ex of exercises) {
		if ((highestTierById.get(ex.id) ?? "NONE") !== "NONE") {
			visitedPropagate.add(ex.id);
			propagateQueue.push(ex.id);
		}
	}

	while (propagateQueue.length > 0) {
		const currId = propagateQueue.shift();
		if (!currId) break;
		for (const parentId of incomingProgressionParents.get(currId) ?? []) {
			if (!visitedPropagate.has(parentId)) {
				visitedPropagate.add(parentId);
				propagateQueue.push(parentId);
				if ((highestTierById.get(parentId) ?? "NONE") === "NONE") {
					highestTierById.set(parentId, "BRONZE");
					impliedIds.add(parentId);
				}
			}
		}
	}

	// 5. Evaluate smart AND/OR unlock gates and build SkillNodeProgress records
	const masteryByExerciseId: Record<string, SkillNodeProgress> = {};
	const counts = {
		mastered: 0,
		ongoing: 0,
		locked: 0,
		bronze: 0,
		silver: 0,
		gold: 0,
	};

	for (const ex of exercises) {
		const highestTier = highestTierById.get(ex.id) ?? "NONE";
		const impliedByProgression = impliedIds.has(ex.id);
		const rawTiers = directTiersById.get(ex.id) ?? [];
		const tiers = rawTiers.map((tierItem) => {
			if (
				impliedByProgression &&
				tierItem.tier === "BRONZE" &&
				!tierItem.achieved
			) {
				return {
					...tierItem,
					achieved: true,
					implied: true,
					progressPercent: 100,
				};
			}
			return tierItem;
		});

		const incomingRequirements: SkillEdgeRequirement[] = [];
		for (const edge of incomingEdgesByTarget.get(ex.id) ?? []) {
			const source = byId.get(edge.fromExerciseId);
			if (!source) continue;
			const sourceTier = highestTierById.get(source.id) ?? "NONE";
			incomingRequirements.push({
				edgeId: edge.id,
				exerciseId: source.id,
				exerciseName: source.name,
				exercisePattern: source.pattern,
				kind: edge.kind,
				branchLabel: edge.branchLabel,
				requiredTier: edge.requiredTier,
				currentTier: sourceTier,
				isMet: TIER_RANK[sourceTier] >= TIER_RANK[edge.requiredTier],
				isCrossPattern: source.pattern !== ex.pattern,
			});
		}

		const outgoingUnlocks: SkillEdgeRequirement[] = [];
		for (const edge of outgoingEdgesBySource.get(ex.id) ?? []) {
			const target = byId.get(edge.toExerciseId);
			if (!target) continue;
			const targetTier = highestTierById.get(target.id) ?? "NONE";
			outgoingUnlocks.push({
				edgeId: edge.id,
				exerciseId: target.id,
				exerciseName: target.name,
				exercisePattern: target.pattern,
				kind: edge.kind,
				branchLabel: edge.branchLabel,
				requiredTier: edge.requiredTier,
				currentTier: targetTier,
				isMet: TIER_RANK[highestTier] >= TIER_RANK[edge.requiredTier],
				isCrossPattern: ex.pattern !== target.pattern,
			});
		}

		const crossPatternPrerequisites = incomingRequirements.filter(
			(req) => req.isCrossPattern,
		);

		const progressionOrAltReqs = incomingRequirements.filter(
			(req) => req.kind === "PROGRESSION" || req.kind === "ALTERNATIVE",
		);
		const prerequisiteReqs = incomingRequirements.filter(
			(req) => req.kind === "PREREQUISITE",
		);

		const progressionGateMet =
			progressionOrAltReqs.length === 0 ||
			progressionOrAltReqs.some((req) => req.isMet);
		const prereqGateMet = prerequisiteReqs.every((req) => req.isMet);

		const totalSetsLogged = totalSetsByExercise.get(ex.id) ?? 0;

		let status: SkillNodeStatus;
		if (highestTier !== "NONE") {
			status = "mastered";
			counts.mastered += 1;
		} else if ((progressionGateMet && prereqGateMet) || totalSetsLogged > 0) {
			status = "ongoing";
			counts.ongoing += 1;
		} else {
			status = "locked";
			counts.locked += 1;
		}

		if (highestTier === "BRONZE") counts.bronze += 1;
		else if (highestTier === "SILVER") counts.silver += 1;
		else if (highestTier === "GOLD") counts.gold += 1;

		const bronzeTier = tiers.find((t) => t.tier === "BRONZE") ?? tiers[0];
		const bestSetsInSession = bronzeTier?.bestSetsInSession ?? 0;
		const targetSets =
			bronzeTier?.targetSets ?? Math.max(1, ex.masteryTargetSets || 3);
		const targetValue = bronzeTier?.targetValue ?? getLegacyTargetValue(ex);
		const progressPercent =
			status === "mastered" ? 100 : (bronzeTier?.progressPercent ?? 0);

		masteryByExerciseId[ex.id] = {
			exerciseId: ex.id,
			status,
			highestTier,
			impliedByProgression,
			tiers,
			bestSetsInSession,
			targetSets,
			targetValue,
			measure: ex.measure,
			totalSetsLogged,
			progressPercent,
			incomingRequirements,
			outgoingUnlocks,
			crossPatternPrerequisites,
		};
	}

	// 6. Build branchesByPattern for backward compatibility
	const branchesByPattern = Object.fromEntries(
		MOVEMENT_PATTERNS.map((pattern) => [pattern, []]),
	) as unknown as Record<MovementPattern, SkillTreeBranch<T>[]>;

	const nextIdById = new Map<string, string>();
	const parentIdByChildId = new Map<string, string>();

	for (const ex of exercises) {
		let nextId =
			ex.progressionNextId && byId.has(ex.progressionNextId)
				? ex.progressionNextId
				: undefined;
		if (!nextId) {
			const primaryEdge = resolvedEdges.find(
				(edge) =>
					edge.fromExerciseId === ex.id &&
					edge.kind === "PROGRESSION" &&
					byId.get(edge.toExerciseId)?.pattern === ex.pattern,
			);
			nextId = primaryEdge?.toExerciseId;
		}
		if (!nextId || nextId === ex.id) continue;
		nextIdById.set(ex.id, nextId);

		const existingParentId = parentIdByChildId.get(nextId);
		if (!existingParentId) {
			parentIdByChildId.set(nextId, ex.id);
		} else {
			const existingParent = byId.get(existingParentId);
			if (existingParent && ex.difficulty < existingParent.difficulty) {
				parentIdByChildId.set(nextId, ex.id);
			}
		}
	}

	const assigned = new Set<string>();
	const roots = [...exercises]
		.filter((ex) => {
			const parentId = parentIdByChildId.get(ex.id);
			if (!parentId) return true;
			const parent = byId.get(parentId);
			return !parent || parent.pattern !== ex.pattern;
		})
		.sort(
			(a, b) => a.difficulty - b.difficulty || a.name.localeCompare(b.name),
		);

	for (const root of roots) {
		if (assigned.has(root.id)) continue;
		const chain: (T & { mastery: SkillNodeProgress })[] = [];
		let curr: T | undefined = root;
		while (curr && !assigned.has(curr.id) && curr.pattern === root.pattern) {
			assigned.add(curr.id);
			chain.push({
				...curr,
				mastery: masteryByExerciseId[curr.id],
			});
			const nextId = nextIdById.get(curr.id);
			curr = nextId ? byId.get(nextId) : undefined;
		}
		if (chain.length > 0) {
			branchesByPattern[root.pattern].push({
				rootId: root.id,
				nodes: chain,
			});
		}
	}

	for (const ex of exercises) {
		if (assigned.has(ex.id)) continue;
		assigned.add(ex.id);
		branchesByPattern[ex.pattern].push({
			rootId: ex.id,
			nodes: [{ ...ex, mastery: masteryByExerciseId[ex.id] }],
		});
	}

	return {
		masteryByExerciseId,
		branchesByPattern,
		edges: resolvedEdges,
		counts,
	};
}
