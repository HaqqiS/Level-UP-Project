import { Suspense } from "react";
import { OnboardingWizard } from "@/components/features/onboarding/onboarding-wizard";
import { requireSession } from "@/lib/auth/session";

async function Gate() {
	await requireSession();
	return <OnboardingWizard />;
}

export default function OnboardingPage() {
	return (
		<Suspense fallback={<div className="min-h-dvh" />}>
			<Gate />
		</Suspense>
	);
}
