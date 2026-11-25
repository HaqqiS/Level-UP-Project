import "server-only";
import { z } from "zod";
import {
	type LogMeasurementsBatchInput,
	LogMeasurementsBatchInputSchema,
	type LogWeightInput,
	LogWeightInputSchema,
	MEASUREMENT_TYPES,
	type MeasurementEntryPoint,
	type MeasurementType,
	type WeightEntryPoint,
} from "@/lib/body/metrics";
import { db } from "@/lib/db";
import { syncStatsAndAchievementsConverged } from "@/server/services/gamification-service";
import { assertCanGeneratePlan } from "@/server/services/plan-gate";
import { getLocalDateKey } from "@/server/services/weekly-plan-service";

export { MEASUREMENT_TYPES, type MeasurementType };

export const LogMeasurementInputSchema = z.object({
	type: z.enum(MEASUREMENT_TYPES),
	valueCm: z.number().min(15).max(250),
});
export type LogMeasurementInput = z.input<typeof LogMeasurementInputSchema>;

export async function getBodyTrackingData(userId: string) {
	const profile = await db.profile.findUnique({ where: { userId } });
	assertCanGeneratePlan(profile);
	if (!profile) throw new Error("Profile missing");

	const [weightRows, latestHeight, measurementRows] = await Promise.all([
		db.bodyMetric.findMany({
			where: { userId, type: "WEIGHT" },
			orderBy: { measuredAt: "desc" },
			take: 180,
		}),
		db.bodyMetric.findFirst({
			where: { userId, type: "HEIGHT" },
			orderBy: { measuredAt: "desc" },
		}),
		db.bodyMetric.findMany({
			where: { userId, type: { in: [...MEASUREMENT_TYPES] } },
			orderBy: { measuredAt: "desc" },
			take: 180,
		}),
	]);

	const entries: WeightEntryPoint[] = weightRows.map((row) => ({
		id: row.id,
		dateKey: getLocalDateKey(profile.timezone, row.measuredAt),
		valueKg: Math.round(Number(row.value) * 10) / 10,
		measuredAt: row.measuredAt.toISOString(),
	}));

	const measurementEntries: MeasurementEntryPoint[] = measurementRows
		.filter((row): row is typeof row & { type: MeasurementType } =>
			(MEASUREMENT_TYPES as readonly string[]).includes(row.type),
		)
		.map((row) => ({
			id: row.id,
			type: row.type,
			dateKey: getLocalDateKey(profile.timezone, row.measuredAt),
			valueCm: Math.round(Number(row.value) * 10) / 10,
			measuredAt: row.measuredAt.toISOString(),
		}));

	let latestWaist: number | null = null;
	let latestChest: number | null = null;
	let latestArm: number | null = null;
	for (const item of measurementEntries) {
		if (item.type === "WAIST" && latestWaist === null) {
			latestWaist = item.valueCm;
		} else if (item.type === "CHEST" && latestChest === null) {
			latestChest = item.valueCm;
		} else if (item.type === "ARM" && latestArm === null) {
			latestArm = item.valueCm;
		}
		if (latestWaist !== null && latestChest !== null && latestArm !== null) {
			break;
		}
	}

	return {
		todayKey: getLocalDateKey(profile.timezone),
		latestHeightCm: latestHeight ? Number(latestHeight.value) : null,
		entries,
		measurementEntries,
		measurements: {
			WAIST: latestWaist,
			CHEST: latestChest,
			ARM: latestArm,
		},
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

	await syncStatsAndAchievementsConverged(params.userId);

	return { ok: true, id: created.id };
}

export async function logMeasurementForUser(params: {
	userId: string;
	input: LogMeasurementInput;
}): Promise<LogWeightResult> {
	const parsed = LogMeasurementInputSchema.safeParse(params.input);
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
			type: parsed.data.type,
			value: Math.round(parsed.data.valueCm * 10) / 10,
			unit: "cm",
		},
		select: { id: true },
	});

	await syncStatsAndAchievementsConverged(params.userId);

	return { ok: true, id: created.id };
}

export type LogMeasurementsBatchResult =
	| { ok: true; ids: string[] }
	| { ok: false; reason: "invalid" };

export async function logMeasurementsBatchForUser(params: {
	userId: string;
	input: LogMeasurementsBatchInput;
}): Promise<LogMeasurementsBatchResult> {
	const parsed = LogMeasurementsBatchInputSchema.safeParse(params.input);
	if (!parsed.success) {
		return { ok: false, reason: "invalid" };
	}

	const profile = await db.profile.findUnique({
		where: { userId: params.userId },
	});
	assertCanGeneratePlan(profile);

	const entriesToCreate: Array<{ type: MeasurementType; valueCm: number }> = [];
	if (parsed.data.waistCm != null) {
		entriesToCreate.push({ type: "WAIST", valueCm: parsed.data.waistCm });
	}
	if (parsed.data.chestCm != null) {
		entriesToCreate.push({ type: "CHEST", valueCm: parsed.data.chestCm });
	}
	if (parsed.data.armCm != null) {
		entriesToCreate.push({ type: "ARM", valueCm: parsed.data.armCm });
	}

	const measuredAt = new Date();
	const createdRows = await db.$transaction(
		entriesToCreate.map((entry) =>
			db.bodyMetric.create({
				data: {
					userId: params.userId,
					type: entry.type,
					value: Math.round(entry.valueCm * 10) / 10,
					unit: "cm",
					measuredAt,
				},
				select: { id: true },
			}),
		),
	);

	await syncStatsAndAchievementsConverged(params.userId);

	return { ok: true, ids: createdRows.map((row) => row.id) };
}

export type DeleteMeasurementResult =
	| { ok: true }
	| { ok: false; reason: "not_found" };

export async function deleteMeasurementEntriesForUser(params: {
	userId: string;
	metricIds: string[];
}): Promise<DeleteMeasurementResult> {
	if (
		!Array.isArray(params.metricIds) ||
		params.metricIds.length === 0 ||
		params.metricIds.length > 10
	) {
		return { ok: false, reason: "not_found" };
	}

	const cleanIds = params.metricIds.filter(
		(id) => typeof id === "string" && id.trim().length > 0,
	);
	if (cleanIds.length === 0) {
		return { ok: false, reason: "not_found" };
	}

	const deleted = await db.bodyMetric.deleteMany({
		where: {
			id: { in: cleanIds },
			userId: params.userId,
			type: { in: [...MEASUREMENT_TYPES] },
		},
	});
	if (deleted.count === 0) {
		return { ok: false, reason: "not_found" };
	}

	return { ok: true };
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
