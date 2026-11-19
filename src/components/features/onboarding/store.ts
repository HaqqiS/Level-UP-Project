"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { OnboardingInput } from "@/lib/validation/onboarding";

type Draft = Partial<OnboardingInput>;

type OnboardingState = {
	step: number;
	draft: Draft;
	setStep: (step: number) => void;
	update: (patch: Draft) => void;
	reset: () => void;
};

export const useOnboardingStore = create<OnboardingState>()(
	persist(
		(set) => ({
			step: 0,
			draft: { goals: [], equipment: [], trainingDays: [], injuries: [] },
			setStep: (step) => set({ step }),
			update: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
			reset: () =>
				set({
					step: 0,
					draft: { goals: [], equipment: [], trainingDays: [], injuries: [] },
				}),
		}),
		{ name: "cq-onboarding", storage: createJSONStorage(() => sessionStorage) },
	),
);
