"use server";
import { revalidatePath } from "next/cache";
import { requireOnboarded } from "@/lib/auth/session";
import type { OfflineSyncBatch } from "@/lib/offline/queue-logic";
import {
	type CompleteQuestResult,
	completeSideQuest,
} from "@/server/services/gamification-service";
import {
	finalizeWorkoutSession,
	type LogSetInput,
	type LogSetResult,
	logExerciseSet,
	type SyncBatchResult,
	syncOfflineWorkoutBatch,
} from "@/server/services/workout-log-service";

export async function logSetAction(input: LogSetInput): Promise<LogSetResult> {
	const { session } = await requireOnboarded();
	const result = await logExerciseSet({ userId: session.user.id, input });
	if (result.ok) {
		revalidatePath("/today");
		revalidatePath("/calendar");
		revalidatePath("/profile");
	}
	return result;
}

export async function finishWorkoutSessionAction(workoutLogId: string) {
	const { session } = await requireOnboarded();
	const result = await finalizeWorkoutSession(session.user.id, workoutLogId);
	if (result.ok) {
		revalidatePath("/today");
		revalidatePath("/calendar");
		revalidatePath("/profile");
	}
	return result;
}

export async function completeQuestAction(
	questId: string,
): Promise<CompleteQuestResult> {
	const { session } = await requireOnboarded();
	if (typeof questId !== "string" || !questId.trim()) {
		return { ok: false, reason: "not_found" };
	}
	const result = await completeSideQuest({
		userId: session.user.id,
		questId,
	});
	if (result.ok) {
		revalidatePath("/today");
		revalidatePath("/calendar");
		revalidatePath("/profile");
	}
	return result;
}

export async function syncOfflineWorkoutBatchAction(
	batch: OfflineSyncBatch,
): Promise<SyncBatchResult> {
	const { session } = await requireOnboarded();
	const result = await syncOfflineWorkoutBatch({
		userId: session.user.id,
		batch,
	});
	if (result.ok) {
		revalidatePath("/today");
		revalidatePath("/calendar");
		revalidatePath("/profile");
	}
	return result;
}
