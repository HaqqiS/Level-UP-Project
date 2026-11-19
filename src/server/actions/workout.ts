"use server";
import { revalidatePath } from "next/cache";
import { requireOnboarded } from "@/lib/auth/session";
import {
	type CompleteQuestResult,
	completeSideQuest,
} from "@/server/services/gamification-service";
import {
	finalizeWorkoutSession,
	type LogSetInput,
	type LogSetResult,
	logExerciseSet,
} from "@/server/services/workout-log-service";

export async function logSetAction(input: LogSetInput): Promise<LogSetResult> {
	const { session } = await requireOnboarded();
	const result = await logExerciseSet({ userId: session.user.id, input });
	if (result.ok) {
		revalidatePath("/today");
		revalidatePath("/log");
	}
	return result;
}

export async function finishWorkoutSessionAction(workoutLogId: string) {
	const { session } = await requireOnboarded();
	const result = await finalizeWorkoutSession(session.user.id, workoutLogId);
	if (result.ok) {
		revalidatePath("/today");
		revalidatePath("/log");
	}
	return result;
}

export async function completeQuestAction(
	questId: string,
): Promise<CompleteQuestResult> {
	const { session } = await requireOnboarded();
	const result = await completeSideQuest({
		userId: session.user.id,
		questId,
	});
	if (result.ok) {
		revalidatePath("/today");
		revalidatePath("/log");
	}
	return result;
}
