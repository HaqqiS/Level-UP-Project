"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { syncOfflineWorkoutBatchAction } from "@/server/actions/workout";
import {
	clearSyncedItems,
	enqueueOfflineFinish,
	enqueueOfflineSet,
	getAllPendingBatch,
	listPendingForDate,
	type PendingSetRecord,
} from "./db";
import { type DisplaySetItem, mergeServerAndPendingSets } from "./queue-logic";

export function useOfflineLogger(params: {
	dateKey: string;
	plannedSessionId: string;
	serverSets: readonly DisplaySetItem[];
	serverCompleted: boolean;
}) {
	const { dateKey, plannedSessionId, serverSets, serverCompleted } = params;
	const [isOnline, setIsOnline] = useState(
		typeof navigator !== "undefined" ? navigator.onLine : true,
	);
	const [pendingSets, setPendingSets] = useState<PendingSetRecord[]>([]);
	const [hasPendingFinish, setHasPendingFinish] = useState(false);
	const [recentlySynced, setRecentlySynced] = useState<{
		dateKey: string;
		sets: DisplaySetItem[];
		finished: boolean;
	}>({
		dateKey,
		sets: [],
		finished: false,
	});
	const [isSyncing, setIsSyncing] = useState(false);

	useEffect(() => {
		const serverKeys = new Set(
			serverSets.map((s) => `${s.exerciseId}:${s.setNumber}`),
		);
		setRecentlySynced((prev) => {
			if (prev.dateKey !== dateKey) {
				if (prev.sets.length === 0 && !prev.finished) return prev;
				return { dateKey, sets: [], finished: false };
			}
			const remainingSets = prev.sets.filter(
				(s) => !serverKeys.has(`${s.exerciseId}:${s.setNumber}`),
			);
			const nextFinished = serverCompleted ? false : prev.finished;
			if (
				remainingSets.length === prev.sets.length &&
				nextFinished === prev.finished
			) {
				return prev;
			}
			return {
				dateKey,
				sets: remainingSets,
				finished: nextFinished,
			};
		});
	}, [dateKey, serverSets, serverCompleted]);

	const refreshLocalQueue = useCallback(async () => {
		const local = await listPendingForDate(dateKey);
		setPendingSets(local.sets);
		setHasPendingFinish(local.hasFinish);
	}, [dateKey]);

	const syncNow = useCallback(async (): Promise<{
		synced: boolean;
		xpEarned: number;
	}> => {
		if (typeof navigator !== "undefined" && !navigator.onLine) {
			return { synced: false, xpEarned: 0 };
		}
		const batch = await getAllPendingBatch();
		if (batch.sets.length === 0 && batch.finishedDateKeys.length === 0) {
			return { synced: true, xpEarned: 0 };
		}

		setIsSyncing(true);
		try {
			const res = await syncOfflineWorkoutBatchAction(batch);
			if (res.ok) {
				const syncedIdSet = new Set(res.syncedClientIds);
				const syncedForToday = batch.sets.filter(
					(s) => s.dateKey === dateKey && syncedIdSet.has(s.clientId),
				);
				const syncedFinishToday = res.syncedFinishedDateKeys.includes(dateKey);

				if (syncedForToday.length > 0 || syncedFinishToday) {
					setRecentlySynced((prev) => {
						const baseSets = prev.dateKey === dateKey ? prev.sets : [];
						const byKey = new Map<string, DisplaySetItem>();
						for (const item of baseSets) {
							byKey.set(`${item.exerciseId}:${item.setNumber}`, item);
						}
						for (const s of syncedForToday) {
							byKey.set(`${s.exerciseId}:${s.setNumber}`, {
								id: s.clientId,
								exerciseId: s.exerciseId,
								setNumber: s.setNumber,
								reps: s.reps ?? null,
								seconds: s.seconds ?? null,
								pending: false,
							});
						}
						return {
							dateKey,
							sets: [...byKey.values()],
							finished:
								(prev.dateKey === dateKey && prev.finished) ||
								syncedFinishToday,
						};
					});
				}

				await clearSyncedItems({
					clientIds: res.syncedClientIds,
					finishedDateKeys: res.syncedFinishedDateKeys,
				});
				await refreshLocalQueue();
				return { synced: true, xpEarned: res.xpEarned };
			}
			return { synced: false, xpEarned: 0 };
		} catch {
			return { synced: false, xpEarned: 0 };
		} finally {
			setIsSyncing(false);
		}
	}, [dateKey, refreshLocalQueue]);

	useEffect(() => {
		refreshLocalQueue();
		if (typeof navigator !== "undefined" && navigator.onLine) {
			void syncNow();
		}
	}, [refreshLocalQueue, syncNow]);

	useEffect(() => {
		const handleOnline = () => {
			setIsOnline(true);
			void syncNow();
		};
		const handleOffline = () => setIsOnline(false);

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);
		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, [syncNow]);

	const logSetOfflineFirst = useCallback(
		async (input: {
			exerciseId: string;
			setNumber: number;
			reps: number | null;
			seconds: number | null;
		}) => {
			await enqueueOfflineSet({
				clientId: crypto.randomUUID(),
				plannedSessionId,
				exerciseId: input.exerciseId,
				dateKey,
				setNumber: input.setNumber,
				reps: input.reps,
				seconds: input.seconds,
			});
			await refreshLocalQueue();
			return syncNow();
		},
		[dateKey, plannedSessionId, refreshLocalQueue, syncNow],
	);

	const finishSessionOfflineFirst = useCallback(async () => {
		await enqueueOfflineFinish(dateKey);
		await refreshLocalQueue();
		return syncNow();
	}, [dateKey, refreshLocalQueue, syncNow]);

	const effectiveServerSets = useMemo(() => {
		const syncedForDate =
			recentlySynced.dateKey === dateKey ? recentlySynced.sets : [];
		if (syncedForDate.length === 0) return serverSets;

		const byKey = new Map<string, DisplaySetItem>();
		for (const set of syncedForDate) {
			byKey.set(`${set.exerciseId}:${set.setNumber}`, set);
		}
		for (const set of serverSets) {
			byKey.set(`${set.exerciseId}:${set.setNumber}`, set);
		}
		return [...byKey.values()];
	}, [dateKey, serverSets, recentlySynced]);

	const mergedSets = useMemo(
		() => mergeServerAndPendingSets(effectiveServerSets, pendingSets),
		[effectiveServerSets, pendingSets],
	);

	const recentlySyncedFinish =
		recentlySynced.dateKey === dateKey && recentlySynced.finished;

	return {
		isOnline,
		isSyncing,
		pendingCount: pendingSets.length + (hasPendingFinish ? 1 : 0),
		mergedSets,
		isCompletedOptimistic:
			serverCompleted || hasPendingFinish || recentlySyncedFinish,
		logSetOfflineFirst,
		finishSessionOfflineFirst,
		syncNow,
	};
}
