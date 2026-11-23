import "server-only";
import { z } from "zod";
import {
	type LogWeightInput,
	LogWeightInputSchema,
	type WeightEntryPoint,
} from "@/lib/body/metrics";
import { db } from "@/lib/db";
import {
	recalculateAndSaveUserStats,
	syncAchievementsForUser,
} from "@/server/services/gamification-service";
import { assertCanGeneratePlan } from "@/server/services/plan-gate";
import { getLocalDateKey } from "@/server/services/weekly-plan-service";

export const MEASUREMENT_TYPES = ["WAIST", "CHEST", "ARM"] as const;
export type MeasurementType = (typeof MEASUREMENT_TYPES)[number];

export const LogMeasurementInputSchema = z.object({
	type: z.enum(MEASUREMENT_TYPES),
	valueCm: z.number().min(15).max(250),
});
export type LogMeasurementInput = z.input<typeof LogMeasurementInputSchema>;

export async function getBodyTrackingData(userId: string) {
	const profile = await db.profile.findUnique({ where: { userId } });
	assertCanGeneratePlan(profile);
	if (!profile) throw new Error("Profile missing");

	const [weightRows, latestHeight, latestWaist, latestChest, latestArm] =
		await Promise.all([
			db.bodyMetric.findMany({
				where: { userId, type: "WEIGHT" },
				orderBy: { measuredAt: "desc" },
				take: 180,
			}),
			db.bodyMetric.findFirst({
				where: { userId, type: "HEIGHT" },
				orderBy: { measuredAt: "desc" },
			}),
			db.bodyMetric.findFirst({
				where: { userId, type: "WAIST" },
				orderBy: { measuredAt: "desc" },
			}),
			db.bodyMetric.findFirst({
				where: { userId, type: "CHEST" },
				orderBy: { measuredAt: "desc" },
			}),
			db.bodyMetric.findFirst({
				where: { userId, type: "ARM" },
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
		measurements: {
			WAIST: latestWaist ? Number(latestWaist.value) : null,
			CHEST: latestChest ? Number(latestChest.value) : null,
			ARM: latestArm ? Number(latestArm.value) : null,
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

	const stats = await recalculateAndSaveUserStats(params.userId);
	await syncAchievementsForUser(params.userId, stats);
	await recalculateAndSaveUserStats(params.userId);

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

	const stats = await recalculateAndSaveUserStats(params.userId);
	await syncAchievementsForUser(params.userId, stats);
	await recalculateAndSaveUserStats(params.userId);

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
