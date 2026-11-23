"use server";
import { revalidatePath } from "next/cache";
import { requireOnboarded } from "@/lib/auth/session";
import type {
	PushSubscriptionPayload,
	ReminderSettingsInput,
} from "@/lib/push/reminder-logic";
import {
	deletePushSubscriptionForUser,
	sendTestPushToUser,
	updateReminderSettingsForUser,
	upsertPushSubscriptionForUser,
} from "@/server/services/push-reminder-service";

export async function savePushSubscriptionAction(
	payload: PushSubscriptionPayload,
) {
	const { session } = await requireOnboarded();
	const result = await upsertPushSubscriptionForUser(session.user.id, payload);
	if (result.ok) {
		revalidatePath("/profile");
	}
	return result;
}

export async function removePushSubscriptionAction(endpoint: string) {
	const { session } = await requireOnboarded();
	const result = await deletePushSubscriptionForUser(session.user.id, endpoint);
	if (result.ok) {
		revalidatePath("/profile");
	}
	return result;
}

export async function updateReminderSettingsAction(
	input: ReminderSettingsInput,
) {
	const { session } = await requireOnboarded();
	const result = await updateReminderSettingsForUser(session.user.id, input);
	if (result.ok) {
		revalidatePath("/profile");
	}
	return result;
}

export async function sendTestPushReminderAction() {
	const { session } = await requireOnboarded();
	return sendTestPushToUser(session.user.id);
}
