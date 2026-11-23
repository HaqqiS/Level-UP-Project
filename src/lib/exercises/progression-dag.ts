export type DagEdge = {
	fromId: string;
	toId: string;
};

export function validateProgressionDag(
	nodeIds: Iterable<string>,
	edges: readonly DagEdge[],
): { ok: boolean; errors: string[] } {
	const nodeSet = new Set(nodeIds);
	const errors: string[] = [];
	const seenEdgeKeys = new Set<string>();
	const adj = new Map<string, string[]>();

	for (const id of nodeSet) {
		adj.set(id, []);
	}

	for (const edge of edges) {
		if (!nodeSet.has(edge.fromId)) {
			errors.push(`Edge references unknown source node: ${edge.fromId}`);
			continue;
		}
		if (!nodeSet.has(edge.toId)) {
			errors.push(`Edge references unknown target node: ${edge.toId}`);
			continue;
		}
		if (edge.fromId === edge.toId) {
			errors.push(`Self-loop detected on node: ${edge.fromId}`);
			continue;
		}
		const key = `${edge.fromId}->${edge.toId}`;
		if (seenEdgeKeys.has(key)) {
			errors.push(`Duplicate edge detected: ${key}`);
			continue;
		}
		seenEdgeKeys.add(key);
		adj.get(edge.fromId)?.push(edge.toId);
	}

	// 0 = unvisited, 1 = visiting, 2 = visited
	const state = new Map<string, 0 | 1 | 2>();
	for (const id of nodeSet) state.set(id, 0);

	function dfs(node: string, path: string[]) {
		state.set(node, 1);
		for (const next of adj.get(node) ?? []) {
			const nextState = state.get(next);
			if (nextState === 1) {
				errors.push(`Cycle detected: ${[...path, next].join(" -> ")}`);
			} else if (nextState === 0) {
				dfs(next, [...path, next]);
			}
		}
		state.set(node, 2);
	}

	for (const id of nodeSet) {
		if (state.get(id) === 0) {
			dfs(id, [id]);
		}
	}

	return {
		ok: errors.length === 0,
		errors,
	};
}

export function wouldEdgeCreateCycle(
	existingEdges: readonly DagEdge[],
	fromId: string,
	toId: string,
): boolean {
	if (fromId === toId) return true;

	const adj = new Map<string, string[]>();
	for (const edge of existingEdges) {
		const list = adj.get(edge.fromId) ?? [];
		list.push(edge.toId);
		adj.set(edge.fromId, list);
	}

	// If `fromId` is reachable from `toId`, adding `fromId -> toId` closes a cycle.
	const queue: string[] = [toId];
	const visited = new Set<string>([toId]);
	while (queue.length > 0) {
		const curr = queue.shift();
		if (!curr) break;
		if (curr === fromId) return true;
		for (const next of adj.get(curr) ?? []) {
			if (!visited.has(next)) {
				visited.add(next);
				queue.push(next);
			}
		}
	}
	return false;
}

export function computeTopologicalTiers(
	nodeIds: Iterable<string>,
	edges: readonly DagEdge[],
): Map<string, number> {
	const nodes = [...nodeIds];
	const nodeSet = new Set(nodes);
	const inDegree = new Map<string, number>();
	const adj = new Map<string, string[]>();
	const tiers = new Map<string, number>();

	for (const id of nodes) {
		inDegree.set(id, 0);
		adj.set(id, []);
		tiers.set(id, 1);
	}

	for (const edge of edges) {
		if (!nodeSet.has(edge.fromId) || !nodeSet.has(edge.toId)) continue;
		if (edge.fromId === edge.toId) continue;
		adj.get(edge.fromId)?.push(edge.toId);
		inDegree.set(edge.toId, (inDegree.get(edge.toId) ?? 0) + 1);
	}

	const queue: string[] = [];
	for (const [id, deg] of inDegree) {
		if (deg === 0) queue.push(id);
	}

	while (queue.length > 0) {
		const curr = queue.shift();
		if (!curr) break;
		const currTier = tiers.get(curr) ?? 1;
		for (const next of adj.get(curr) ?? []) {
			const candidateTier = currTier + 1;
			if (candidateTier > (tiers.get(next) ?? 1)) {
				tiers.set(next, candidateTier);
			}
			const remaining = (inDegree.get(next) ?? 1) - 1;
			inDegree.set(next, remaining);
			if (remaining === 0) {
				queue.push(next);
			}
		}
	}

	return tiers;
}
