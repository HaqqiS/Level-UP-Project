"use server";
import { revalidatePath } from "next/cache";
import type { DailyCheckinInput } from "@/lib/ai/plan-schema";
import { requireOnboarded } from "@/lib/auth/session";
import {
	type CheckinResult,
	submitDailyCheckinAndAdjust,
} from "@/server/services/daily-checkin-service";
import {
	type GeneratePlanResult,
	generateWeeklyPlanForUser,
} from "@/server/services/weekly-plan-service";

export async function generateCurrentWeekPlanAction(): Promise<GeneratePlanResult> {
	const { session } = await requireOnboarded();
	const result = await generateWeeklyPlanForUser(session.user.id);
	if (result.ok) {
		revalidatePath("/today");
		revalidatePath("/plan");
	}
	return result;
}

export async function submitDailyCheckinAction(
	input: DailyCheckinInput,
): Promise<CheckinResult> {
	const { session } = await requireOnboarded();
	const result = await submitDailyCheckinAndAdjust({
		userId: session.user.id,
		input,
	});
	if (result.ok) {
		revalidatePath("/today");
		revalidatePath("/plan");
	}
	return result;
}
