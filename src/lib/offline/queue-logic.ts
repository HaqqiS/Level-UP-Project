import { z } from "zod";

export const OfflineSetPayloadSchema = z.object({
	clientId: z.uuid(),
	plannedSessionId: z.string().min(1).optional(),
	exerciseId: z.string().min(1),
	dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	setNumber: z.number().int().min(1).max(10),
	reps: z.number().int().min(1).max(100).nullable().optional(),
	seconds: z.number().int().min(5).max(600).nullable().optional(),
	createdAt: z.string().optional(),
});

export const OfflineSyncBatchSchema = z.object({
	sets: z.array(OfflineSetPayloadSchema).max(100),
	finishedDateKeys: z
		.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
		.max(30)
		.default([]),
});

export type OfflineSetPayload = z.output<typeof OfflineSetPayloadSchema>;
export type OfflineSyncBatch = z.input<typeof OfflineSyncBatchSchema>;

export type DisplaySetItem = {
	id: string;
	exerciseId: string;
	setNumber: number;
	reps: number | null;
	seconds: number | null;
	pending?: boolean;
};

/**
 * Merges server-synced sets with local Dexie pending sets by `(exerciseId, setNumber)`.
 * Pending entries take precedence so offline edits appear immediately without duplicates.
 */
export function mergeServerAndPendingSets(
	serverSets: readonly DisplaySetItem[],
	pendingSets: readonly OfflineSetPayload[],
): DisplaySetItem[] {
	const byKey = new Map<string, DisplaySetItem>();

	for (const set of serverSets) {
		byKey.set(`${set.exerciseId}:${set.setNumber}`, {
			...set,
			pending: false,
		});
	}

	for (const pending of pendingSets) {
		byKey.set(`${pending.exerciseId}:${pending.setNumber}`, {
			id: pending.clientId,
			exerciseId: pending.exerciseId,
			setNumber: pending.setNumber,
			reps: pending.reps ?? null,
			seconds: pending.seconds ?? null,
			pending: true,
		});
	}

	return [...byKey.values()].sort((a, b) => a.setNumber - b.setNumber);
}
