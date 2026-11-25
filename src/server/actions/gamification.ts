"use server";
import { revalidatePath } from "next/cache";
import { requireOnboarded } from "@/lib/auth/session";
import {
	type EquipTitleResult,
	equipTitleForUser,
} from "@/server/services/gamification-service";

export async function equipTitleAction(
	achievementKey: string | null,
): Promise<EquipTitleResult> {
	const { session } = await requireOnboarded();
	if (achievementKey !== null && typeof achievementKey !== "string") {
		return { ok: false, reason: "invalid" };
	}

	const result = await equipTitleForUser({
		userId: session.user.id,
		achievementKey,
	});
	if (result.ok) {
		revalidatePath("/profile");
		revalidatePath("/today");
	}
	return result;
}
