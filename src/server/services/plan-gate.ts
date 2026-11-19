export class OnboardingIncompleteError extends Error {
	constructor() {
		super(
			"Onboarding and health disclaimer must be completed before generating a plan.",
		);
		this.name = "OnboardingIncompleteError";
	}
}

type GateProfile = {
	onboardingCompletedAt: Date | null;
	disclaimerAcceptedAt: Date | null;
} | null;

/** Pure check — throws if the user may not generate a plan yet. */
export function assertCanGeneratePlan(profile: GateProfile): void {
	if (!profile?.onboardingCompletedAt || !profile.disclaimerAcceptedAt) {
		throw new OnboardingIncompleteError();
	}
}

export function canGeneratePlan(profile: GateProfile): boolean {
	try {
		assertCanGeneratePlan(profile);
		return true;
	} catch {
		return false;
	}
}
