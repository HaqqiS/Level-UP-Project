import { Suspense } from "react";
import { OnboardingWizard } from "@/components/features/onboarding/onboarding-wizard";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { OnboardingInput } from "@/lib/validation/onboarding";

async function Gate() {
	const session = await requireSession();
	const [profile, latestHeight, latestWeight] = await Promise.all([
		db.profile.findUnique({
			where: { userId: session.user.id },
		}),
		db.bodyMetric.findFirst({
			where: { userId: session.user.id, type: "HEIGHT" },
			orderBy: { measuredAt: "desc" },
			select: { value: true },
		}),
		db.bodyMetric.findFirst({
			where: { userId: session.user.id, type: "WEIGHT" },
			orderBy: { measuredAt: "desc" },
			select: { value: true },
		}),
	]);

	const initialDraft: Partial<OnboardingInput> | undefined = profile
		? {
				experienceLevel: profile.experienceLevel,
				maxPushups: profile.maxPushups ?? undefined,
				maxPullups: profile.maxPullups ?? undefined,
				plankSeconds: profile.plankSeconds ?? undefined,
				goals: profile.goals as OnboardingInput["goals"],
				equipment: profile.equipment as OnboardingInput["equipment"],
				trainingDays: profile.trainingDays,
				sessionMinutes:
					profile.sessionMinutes as OnboardingInput["sessionMinutes"],
				heightCm:
					latestHeight !== null
						? Math.round(Number(latestHeight.value))
						: undefined,
				weightKg:
					latestWeight !== null
						? Math.round(Number(latestWeight.value) * 100) / 100
						: undefined,
				birthYear: profile.birthYear ?? undefined,
				sex: (profile.sex as OnboardingInput["sex"]) ?? undefined,
				tracksPeriod: profile.tracksPeriod,
				lastPeriodStartDate: profile.lastPeriodStartDate ?? undefined,
				averageCycleDays: profile.averageCycleDays,
				averagePeriodDays: profile.averagePeriodDays,
				cycleRegularity: profile.cycleRegularity,
				injuries: profile.injuries as OnboardingInput["injuries"],
				injuryNotes: profile.injuryNotes ?? undefined,
			}
		: undefined;

	return <OnboardingWizard initialDraft={initialDraft} />;
}

export default function OnboardingPage() {
	return (
		<Suspense fallback={<div className="min-h-dvh" />}>
			<Gate />
		</Suspense>
	);
}
