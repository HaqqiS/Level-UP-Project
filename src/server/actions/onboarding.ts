"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { ExperienceLevel } from "@/lib/exercises/eligibility";
import {
	type RankTier,
	resolveEffectiveExperienceLevel,
} from "@/lib/gamification/engine";
import {
	type OnboardingInput,
	OnboardingSchema,
} from "@/lib/validation/onboarding";
import { diffDaysUtc } from "@/lib/wellness/cycle-engine";

export type OnboardingResult = { ok: false; error: string };

export async function completeOnboarding(
	input: OnboardingInput,
): Promise<OnboardingResult> {
	const session = await requireSession();
	const parsed = OnboardingSchema.safeParse(input);
	if (!parsed.success) {
		return { ok: false, error: "invalid" };
	}
	const d = parsed.data;
	const userId = session.user.id;
	const now = new Date();

	const isFemalePeriodTracking = d.sex === "female" && Boolean(d.tracksPeriod);
	const averageCycleDays = d.averageCycleDays ?? 28;
	const averagePeriodDays = d.averagePeriodDays ?? 5;

	await db.$transaction(async (tx) => {
		let effectiveLastPeriodStartDate = isFemalePeriodTracking
			? (d.lastPeriodStartDate ?? null)
			: null;

		if (isFemalePeriodTracking) {
			if (d.lastPeriodStartDate) {
				// Remove stale anchor-only cycles (endDate: null) from previous onboarding runs
				// so old onboarding dates never conflict with the new lastPeriodStartDate.
				await tx.menstrualCycle.deleteMany({
					where: {
						userId,
						endDate: null,
						notes: null,
						startDate: { not: d.lastPeriodStartDate },
					},
				});

				const existingAtStart = await tx.menstrualCycle.findUnique({
					where: {
						userId_startDate: {
							userId,
							startDate: d.lastPeriodStartDate,
						},
					},
					select: { id: true, endDate: true },
				});

				if (!existingAtStart) {
					await tx.menstrualCycle.create({
						data: {
							userId,
							startDate: d.lastPeriodStartDate,
							periodLengthDays: averagePeriodDays,
							isConfirmed: true,
						},
					});
				} else if (existingAtStart.endDate === null) {
					await tx.menstrualCycle.update({
						where: { id: existingAtStart.id },
						data: { periodLengthDays: averagePeriodDays },
					});
				}
			}

			// Recompute inter-cycle lengths across remaining recorded cycles
			const allCycles = await tx.menstrualCycle.findMany({
				where: { userId },
				orderBy: { startDate: "asc" },
			});
			for (let i = 0; i < allCycles.length; i++) {
				const current = allCycles[i];
				const next = allCycles[i + 1];
				let nextCycleLength: number | null = null;
				if (next) {
					const span = diffDaysUtc(current.startDate, next.startDate);
					nextCycleLength = span >= 15 && span <= 90 ? span : null;
				}
				if (current.cycleLengthDays !== nextCycleLength) {
					await tx.menstrualCycle.update({
						where: { id: current.id },
						data: { cycleLengthDays: nextCycleLength },
					});
				}
			}

			if (!effectiveLastPeriodStartDate && allCycles.length > 0) {
				effectiveLastPeriodStartDate =
					allCycles[allCycles.length - 1]?.startDate ?? null;
			}
		}

		const existingStats = await tx.userStats.findUnique({
			where: { userId },
			select: { rankTier: true },
		});
		const effectiveExperienceLevel = existingStats
			? resolveEffectiveExperienceLevel(
					d.experienceLevel as ExperienceLevel,
					existingStats.rankTier as RankTier,
				)
			: d.experienceLevel;

		const profileData = {
			experienceLevel: effectiveExperienceLevel,
			maxPushups: d.maxPushups ?? null,
			maxPullups: d.maxPullups ?? null,
			plankSeconds: d.plankSeconds ?? null,
			goals: d.goals,
			equipment: d.equipment,
			trainingDays: [...d.trainingDays].sort(),
			sessionMinutes: d.sessionMinutes,
			injuries: d.injuries,
			injuryNotes: d.injuryNotes ?? null,
			birthYear: d.birthYear ?? null,
			sex: d.sex ?? null,
			tracksPeriod: isFemalePeriodTracking,
			lastPeriodStartDate: effectiveLastPeriodStartDate,
			averageCycleDays,
			averagePeriodDays,
			cycleRegularity: isFemalePeriodTracking
				? (d.cycleRegularity ?? "UNKNOWN")
				: "UNKNOWN",
			disclaimerAcceptedAt: now,
			onboardingCompletedAt: now,
		};

		await tx.profile.upsert({
			where: { userId },
			create: { userId, ...profileData },
			update: profileData,
		});

		await tx.bodyMetric.createMany({
			data: [
				{
					userId,
					type: "HEIGHT",
					value: d.heightCm,
					unit: "cm",
					measuredAt: now,
				},
				{
					userId,
					type: "WEIGHT",
					value: d.weightKg,
					unit: "kg",
					measuredAt: now,
				},
			],
		});
	});

	revalidatePath("/today");
	revalidatePath("/calendar");
	revalidatePath("/profile");
	revalidatePath("/plan");
	revalidatePath("/exercises");

	redirect("/today");
}
