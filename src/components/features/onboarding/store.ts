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
	hydrate: (initialDraft: Draft) => void;
	reset: () => void;
};

const EMPTY_DRAFT: Draft = {
	goals: [],
	equipment: [],
	trainingDays: [],
	injuries: [],
};

export const useOnboardingStore = create<OnboardingState>()(
	persist(
		(set) => ({
			step: 0,
			draft: EMPTY_DRAFT,
			setStep: (step) => set({ step }),
			update: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
			hydrate: (initialDraft) =>
				set({
					step: 0,
					draft: {
						...EMPTY_DRAFT,
						...initialDraft,
						disclaimerAccepted: undefined,
					},
				}),
			reset: () =>
				set({
					step: 0,
					draft: EMPTY_DRAFT,
				}),
		}),
		{ name: "cq-onboarding", storage: createJSONStorage(() => sessionStorage) },
	),
);
