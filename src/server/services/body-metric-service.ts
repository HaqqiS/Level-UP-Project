import "server-only";
import {
	type LogWeightInput,
	LogWeightInputSchema,
	type WeightEntryPoint,
} from "@/lib/body/metrics";
import { db } from "@/lib/db";
import { assertCanGeneratePlan } from "@/server/services/plan-gate";
import { getLocalDateKey } from "@/server/services/weekly-plan-service";

export async function getBodyTrackingData(userId: string) {
	const profile = await db.profile.findUnique({ where: { userId } });
	assertCanGeneratePlan(profile);
	if (!profile) throw new Error("Profile missing");

	const [weightRows, latestHeight] = await Promise.all([
		db.bodyMetric.findMany({
			where: { userId, type: "WEIGHT" },
			orderBy: { measuredAt: "desc" },
			take: 180,
		}),
		db.bodyMetric.findFirst({
			where: { userId, type: "HEIGHT" },
			orderBy: { measuredAt: "desc" },
		}),
	]);

	const entries: WeightEntryPoint[] = weightRows.map((row) => ({
		id: row.id,
		dateKey: getLocalDateKey(profile.timezone, row.measuredAt),
		valueKg: Math.round(Number(row.value) * 10) / 10,
		measuredAt: row.measuredAt.toISOString(),
	}));

	return {
		todayKey: getLocalDateKey(profile.timezone),
		latestHeightCm: latestHeight ? Number(latestHeight.value) : null,
		entries,
	};
}

export type LogWeightResult =
	| { ok: true; id: string }
	| { ok: false; reason: "invalid" };

export async function logWeightForUser(params: {
	userId: string;
	input: LogWeightInput;
}): Promise<LogWeightResult> {
	const parsed = LogWeightInputSchema.safeParse(params.input);
	if (!parsed.success) {
		return { ok: false, reason: "invalid" };
	}

	const profile = await db.profile.findUnique({
		where: { userId: params.userId },
	});
	assertCanGeneratePlan(profile);

	const created = await db.bodyMetric.create({
		data: {
			userId: params.userId,
			type: "WEIGHT",
			value: Math.round(parsed.data.weightKg * 10) / 10,
			unit: "kg",
		},
		select: { id: true },
	});

	return { ok: true, id: created.id };
}

export type DeleteWeightResult =
	| { ok: true }
	| { ok: false; reason: "not_found" | "last_entry" };

export async function deleteWeightEntryForUser(params: {
	userId: string;
	metricId: string;
}): Promise<DeleteWeightResult> {
	const existing = await db.bodyMetric.findUnique({
		where: { id: params.metricId },
	});
	if (
		!existing ||
		existing.userId !== params.userId ||
		existing.type !== "WEIGHT"
	) {
		return { ok: false, reason: "not_found" };
	}

	const totalCount = await db.bodyMetric.count({
		where: { userId: params.userId, type: "WEIGHT" },
	});
	if (totalCount <= 1) {
		return { ok: false, reason: "last_entry" };
	}

	await db.bodyMetric.delete({ where: { id: params.metricId } });
	return { ok: true };
}
