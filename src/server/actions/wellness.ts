"use server";
import { revalidatePath } from "next/cache";
import { requireOnboarded } from "@/lib/auth/session";
import type {
	CustomWellnessItemInput,
	CycleSettingsInput,
	DailyWellnessLogInput,
	MenstrualCycleManualInput,
} from "@/lib/wellness/cycle-and-wellness";
import {
	archiveUserWellnessItem,
	createUserWellnessItem,
	deleteManualMenstrualCycle,
	saveDailyWellnessLogForUser,
	updateCycleSettingsForUser,
	upsertManualMenstrualCycle,
} from "@/server/services/wellness-service";

export async function saveDailyWellnessLogAction(input: DailyWellnessLogInput) {
	const { session } = await requireOnboarded();
	const result = await saveDailyWellnessLogForUser(session.user.id, input);
	if (result.ok) {
		revalidatePath("/calendar");
		revalidatePath("/today");
	}
	return result;
}

export async function updateCycleSettingsAction(input: CycleSettingsInput) {
	const { session } = await requireOnboarded();
	const result = await updateCycleSettingsForUser(session.user.id, input);
	if (result.ok) {
		revalidatePath("/profile");
		revalidatePath("/calendar");
		revalidatePath("/today");
	}
	return result;
}

export async function createCustomWellnessItemAction(
	input: CustomWellnessItemInput,
) {
	const { session } = await requireOnboarded();
	const result = await createUserWellnessItem(session.user.id, input);
	if (result.ok) {
		revalidatePath("/calendar");
	}
	return result;
}

export async function archiveCustomWellnessItemAction(itemId: string) {
	const { session } = await requireOnboarded();
	const result = await archiveUserWellnessItem(session.user.id, itemId);
	if (result.ok) {
		revalidatePath("/calendar");
	}
	return result;
}

export async function upsertMenstrualCycleAction(
	input: MenstrualCycleManualInput,
) {
	const { session } = await requireOnboarded();
	const result = await upsertManualMenstrualCycle(session.user.id, input);
	if (result.ok) {
		revalidatePath("/calendar");
		revalidatePath("/profile");
		revalidatePath("/today");
	}
	return result;
}

export async function deleteMenstrualCycleAction(cycleId: string) {
	const { session } = await requireOnboarded();
	const result = await deleteManualMenstrualCycle(session.user.id, cycleId);
	if (result.ok) {
		revalidatePath("/calendar");
		revalidatePath("/profile");
		revalidatePath("/today");
	}
	return result;
}
