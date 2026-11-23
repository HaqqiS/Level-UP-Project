import { describe, expect, it } from "vitest";
import {
	computeTopologicalTiers,
	validateProgressionDag,
	wouldEdgeCreateCycle,
} from "./progression-dag";

describe("progression DAG validator and tiering", () => {
	it("accepts branching and converging acyclic graphs and computes tiers", () => {
		const nodes = ["root", "branch-a", "branch-b", "deep-b", "converge"];
		const edges = [
			{ fromId: "root", toId: "branch-a" },
			{ fromId: "root", toId: "branch-b" },
			{ fromId: "branch-b", toId: "deep-b" },
			{ fromId: "branch-a", toId: "converge" },
			{ fromId: "deep-b", toId: "converge" },
		];

		expect(validateProgressionDag(nodes, edges)).toEqual({
			ok: true,
			errors: [],
		});

		const tiers = computeTopologicalTiers(nodes, edges);
		expect(tiers.get("root")).toBe(1);
		expect(tiers.get("branch-a")).toBe(2);
		expect(tiers.get("branch-b")).toBe(2);
		expect(tiers.get("deep-b")).toBe(3);
		expect(tiers.get("converge")).toBe(4);
	});

	it("detects self-loops, unknown endpoints, duplicates, and cycles", () => {
		expect(
			validateProgressionDag(["a", "b"], [{ fromId: "a", toId: "a" }]).ok,
		).toBe(false);
		expect(
			validateProgressionDag(["a"], [{ fromId: "a", toId: "missing" }]).ok,
		).toBe(false);
		expect(
			validateProgressionDag(
				["a", "b"],
				[
					{ fromId: "a", toId: "b" },
					{ fromId: "a", toId: "b" },
				],
			).ok,
		).toBe(false);
		expect(
			validateProgressionDag(
				["a", "b", "c"],
				[
					{ fromId: "a", toId: "b" },
					{ fromId: "b", toId: "c" },
					{ fromId: "c", toId: "a" },
				],
			).ok,
		).toBe(false);
	});

	it("checks if a candidate prerequisite edge would create a cycle", () => {
		const edges = [
			{ fromId: "a", toId: "b" },
			{ fromId: "b", toId: "c" },
		];
		expect(wouldEdgeCreateCycle(edges, "c", "a")).toBe(true);
		expect(wouldEdgeCreateCycle(edges, "a", "d")).toBe(false);
	});
});
