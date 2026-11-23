"use server";
import { revalidatePath } from "next/cache";
import { requireOnboarded } from "@/lib/auth/session";
import type { LogWeightInput } from "@/lib/body/metrics";
import {
	type DeleteWeightResult,
	deleteWeightEntryForUser,
	type LogMeasurementInput,
	type LogWeightResult,
	logMeasurementForUser,
	logWeightForUser,
} from "@/server/services/body-metric-service";

export async function logWeightAction(
	input: LogWeightInput,
): Promise<LogWeightResult> {
	const { session } = await requireOnboarded();
	const result = await logWeightForUser({ userId: session.user.id, input });
	if (result.ok) {
		revalidatePath("/today");
		revalidatePath("/profile");
	}
	return result;
}

export async function logMeasurementAction(
	input: LogMeasurementInput,
): Promise<LogWeightResult> {
	const { session } = await requireOnboarded();
	const result = await logMeasurementForUser({
		userId: session.user.id,
		input,
	});
	if (result.ok) {
		revalidatePath("/profile");
	}
	return result;
}

export async function deleteWeightEntryAction(
	metricId: string,
): Promise<DeleteWeightResult> {
	const { session } = await requireOnboarded();
	const result = await deleteWeightEntryForUser({
		userId: session.user.id,
		metricId,
	});
	if (result.ok) {
		revalidatePath("/profile");
	}
	return result;
}
