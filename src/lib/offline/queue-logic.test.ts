import { describe, expect, it } from "vitest";
import {
	mergeServerAndPendingSets,
	OfflineSyncBatchSchema,
} from "./queue-logic";

describe("OfflineSyncBatchSchema", () => {
	it("accepts valid UUID clientId batch and rejects invalid clientIds", () => {
		const valid = OfflineSyncBatchSchema.safeParse({
			sets: [
				{
					clientId: "550e8400-e29b-41d4-a716-446655440000",
					exerciseId: "ex-1",
					dateKey: "2026-11-19",
					setNumber: 1,
					reps: 10,
				},
			],
			finishedDateKeys: ["2026-11-19"],
		});
		expect(valid.success).toBe(true);

		const invalid = OfflineSyncBatchSchema.safeParse({
			sets: [
				{
					clientId: "not-a-uuid",
					exerciseId: "ex-1",
					dateKey: "2026-11-19",
					setNumber: 1,
					reps: 10,
				},
			],
		});
		expect(invalid.success).toBe(false);
	});
});

describe("mergeServerAndPendingSets", () => {
	it("merges server and pending sets without duplicates and keeps pending precedence", () => {
		const merged = mergeServerAndPendingSets(
			[
				{ id: "s1", exerciseId: "ex-1", setNumber: 1, reps: 8, seconds: null },
				{ id: "s2", exerciseId: "ex-1", setNumber: 2, reps: 8, seconds: null },
			],
			[
				{
					clientId: "550e8400-e29b-41d4-a716-446655440000",
					exerciseId: "ex-1",
					dateKey: "2026-11-19",
					setNumber: 2,
					reps: 10,
					seconds: null,
				},
				{
					clientId: "550e8400-e29b-41d4-a716-446655440001",
					exerciseId: "ex-1",
					dateKey: "2026-11-19",
					setNumber: 3,
					reps: 9,
					seconds: null,
				},
			],
		);

		expect(merged).toHaveLength(3);
		expect(merged[0]).toMatchObject({ setNumber: 1, reps: 8, pending: false });
		expect(merged[1]).toMatchObject({ setNumber: 2, reps: 10, pending: true });
		expect(merged[2]).toMatchObject({ setNumber: 3, reps: 9, pending: true });
	});
});
