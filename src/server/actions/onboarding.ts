"use server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
	type OnboardingInput,
	OnboardingSchema,
} from "@/lib/validation/onboarding";

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

	const profileData = {
		experienceLevel: d.experienceLevel,
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
		disclaimerAcceptedAt: now,
		onboardingCompletedAt: now,
	};

	await db.$transaction([
		db.profile.upsert({
			where: { userId },
			create: { userId, ...profileData },
			update: profileData,
		}),
		db.bodyMetric.createMany({
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
		}),
	]);

	redirect("/today");
}
