import type { OnboardingInput } from "@/lib/validation/onboarding";

export type StepProps = {
	draft: Partial<OnboardingInput>;
	update: (patch: Partial<OnboardingInput>) => void;
};

export function toggleItem<T>(list: T[] | undefined, value: T): T[] {
	const current = list ?? [];
	return current.includes(value)
		? current.filter((item) => item !== value)
		: [...current, value];
}
