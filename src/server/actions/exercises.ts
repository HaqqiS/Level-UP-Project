"use server";
import { revalidatePath } from "next/cache";
import { requireOnboarded } from "@/lib/auth/session";
import {
	MOVEMENT_PATTERNS,
	type MovementPattern,
} from "@/lib/exercises/eligibility";
import {
	type DiscoveryResult,
	discoverExercisesForProfile,
} from "@/server/services/exercise-discovery";

export async function discoverMoreExercisesAction(
	pattern: MovementPattern,
): Promise<DiscoveryResult> {
	if (!MOVEMENT_PATTERNS.includes(pattern)) {
		return { ok: false, reason: "ai_error" };
	}
	const { session, profile } = await requireOnboarded();
	const result = await discoverExercisesForProfile({
		userId: session.user.id,
		profile,
		pattern,
	});
	if (result.ok) {
		revalidatePath("/exercises");
	}
	return result;
}
