import { describe, expect, it } from "vitest";
import {
	assertCanGeneratePlan,
	canGeneratePlan,
	OnboardingIncompleteError,
} from "./plan-gate";

const now = new Date();

describe("plan gate", () => {
	it("blocks when profile is missing", () => {
		expect(() => assertCanGeneratePlan(null)).toThrow(
			OnboardingIncompleteError,
		);
	});
	it("blocks when onboarding incomplete", () => {
		expect(
			canGeneratePlan({
				onboardingCompletedAt: null,
				disclaimerAcceptedAt: now,
			}),
		).toBe(false);
	});
	it("blocks when disclaimer not accepted", () => {
		expect(
			canGeneratePlan({
				onboardingCompletedAt: now,
				disclaimerAcceptedAt: null,
			}),
		).toBe(false);
	});
	it("allows when both are set", () => {
		expect(
			canGeneratePlan({
				onboardingCompletedAt: now,
				disclaimerAcceptedAt: now,
			}),
		).toBe(true);
	});
});
