"use client";
import Dexie, { type EntityTable } from "dexie";
import type { OfflineSetPayload } from "./queue-logic";

export type PendingSetRecord = OfflineSetPayload & {
	createdAt: string;
};

export type PendingFinishRecord = {
	dateKey: string;
	createdAt: string;
};

class CalisthenicsOfflineDb extends Dexie {
	pendingSets!: EntityTable<PendingSetRecord, "clientId">;
	pendingFinishes!: EntityTable<PendingFinishRecord, "dateKey">;

	constructor() {
		super("calisthenics_quest_offline_v1");
		this.version(1).stores({
			pendingSets:
				"clientId, dateKey, [dateKey+exerciseId+setNumber], createdAt",
			pendingFinishes: "dateKey, createdAt",
		});
	}
}

let dbInstance: CalisthenicsOfflineDb | null = null;

function getOfflineDb(): CalisthenicsOfflineDb | null {
	if (typeof window === "undefined") return null;
	if (!dbInstance) {
		dbInstance = new CalisthenicsOfflineDb();
	}
	return dbInstance;
}

export async function enqueueOfflineSet(payload: OfflineSetPayload) {
	const db = getOfflineDb();
	if (!db) return;

	// Replace any older unsynced entry for the same (dateKey, exerciseId, setNumber).
	await db.pendingSets
		.where("[dateKey+exerciseId+setNumber]")
		.equals([payload.dateKey, payload.exerciseId, payload.setNumber])
		.delete();

	await db.pendingSets.put({
		...payload,
		createdAt: payload.createdAt ?? new Date().toISOString(),
	});
}

export async function enqueueOfflineFinish(dateKey: string) {
	const db = getOfflineDb();
	if (!db) return;
	await db.pendingFinishes.put({
		dateKey,
		createdAt: new Date().toISOString(),
	});
}

export async function listPendingForDate(dateKey: string) {
	const db = getOfflineDb();
	if (!db) return { sets: [], hasFinish: false };

	const [sets, finish] = await Promise.all([
		db.pendingSets.where("dateKey").equals(dateKey).toArray(),
		db.pendingFinishes.get(dateKey),
	]);
	return { sets, hasFinish: Boolean(finish) };
}

export async function getAllPendingBatch() {
	const db = getOfflineDb();
	if (!db) return { sets: [], finishedDateKeys: [] };

	const [sets, finishes] = await Promise.all([
		db.pendingSets.orderBy("createdAt").toArray(),
		db.pendingFinishes.toArray(),
	]);

	return {
		sets,
		finishedDateKeys: finishes.map((f) => f.dateKey),
	};
}

export async function clearSyncedItems(params: {
	clientIds: readonly string[];
	finishedDateKeys: readonly string[];
}) {
	const db = getOfflineDb();
	if (!db) return;

	await db.transaction("rw", db.pendingSets, db.pendingFinishes, async () => {
		if (params.clientIds.length > 0) {
			await db.pendingSets.bulkDelete([...params.clientIds]);
		}
		if (params.finishedDateKeys.length > 0) {
			await db.pendingFinishes.bulkDelete([...params.finishedDateKeys]);
		}
	});
}

export async function clearAllOfflineData() {
	const db = getOfflineDb();
	if (!db) return;

	await db.transaction("rw", db.pendingSets, db.pendingFinishes, async () => {
		await Promise.all([db.pendingSets.clear(), db.pendingFinishes.clear()]);
	});
}
