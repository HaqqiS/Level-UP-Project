"use server";
import { revalidatePath } from "next/cache";
import { requireOnboarded } from "@/lib/auth/session";
import type {
	LogMeasurementsBatchInput,
	LogWeightInput,
} from "@/lib/body/metrics";
import {
	type DeleteMeasurementResult,
	type DeleteWeightResult,
	deleteMeasurementEntriesForUser,
	deleteWeightEntryForUser,
	type LogMeasurementInput,
	type LogMeasurementsBatchResult,
	type LogWeightResult,
	logMeasurementForUser,
	logMeasurementsBatchForUser,
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

export async function logMeasurementsBatchAction(
	input: LogMeasurementsBatchInput,
): Promise<LogMeasurementsBatchResult> {
	const { session } = await requireOnboarded();
	const result = await logMeasurementsBatchForUser({
		userId: session.user.id,
		input,
	});
	if (result.ok) {
		revalidatePath("/today");
		revalidatePath("/profile");
	}
	return result;
}

export async function deleteMeasurementEntriesAction(
	metricIds: string[],
): Promise<DeleteMeasurementResult> {
	const { session } = await requireOnboarded();
	const result = await deleteMeasurementEntriesForUser({
		userId: session.user.id,
		metricIds,
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
