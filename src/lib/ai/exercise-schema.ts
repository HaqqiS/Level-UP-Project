import { z } from "zod";
import { MOVEMENT_PATTERNS } from "@/lib/exercises/eligibility";
import {
	ExerciseMuscleEntrySchema,
	MasteryBenchmarkSpecSchema,
	MUSCLE_GROUPS,
} from "@/lib/exercises/muscles";
import { EQUIPMENT, INJURIES } from "@/lib/validation/onboarding";

export const ExerciseCandidateSchema = z.object({
	name: z.string().trim().min(2).max(80),
	slug: z
		.string()
		.trim()
		.min(2)
		.max(80)
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case"),
	pattern: z.enum(MOVEMENT_PATTERNS),
	difficulty: z.number().int().min(1).max(10),
	equipment: z.array(z.enum(EQUIPMENT)).min(1),
	measure: z.enum(["REPS", "SECONDS"]),
	cues: z.array(z.string().trim().min(4).max(160)).min(2).max(4),
	contraindications: z.array(z.enum(INJURIES)).default([]),
	primaryMuscles: z.array(z.enum(MUSCLE_GROUPS)).max(4).default([]),
	secondaryMuscles: z.array(z.enum(MUSCLE_GROUPS)).max(4).default([]),
	muscles: z.array(ExerciseMuscleEntrySchema).max(8).default([]),
	masteryBenchmarks: z.array(MasteryBenchmarkSpecSchema).max(3).optional(),
	suggestedPrerequisiteSlugs: z
		.array(z.string().trim().min(2).max(80))
		.max(3)
		.default([]),
	sourceUrl: z.url().optional(),
});

export const ExerciseDiscoveryResponseSchema = z.object({
	exercises: z.array(ExerciseCandidateSchema).max(3),
});

/**
 * Lightweight wire schema for Gemini structured output (avoids nested min/max
 * and regex FSM state explosion). Each candidate is strictly parsed through
 * `ExerciseCandidateSchema.safeParse()` immediately after decoding.
 */
export const ExerciseDiscoveryAiWireSchema = z.object({
	exercises: z.array(
		z.object({
			name: z.string(),
			slug: z.string(),
			pattern: z.string(),
			difficulty: z.number().int(),
			equipment: z.array(z.string()),
			measure: z.string(),
			cues: z.array(z.string()),
			contraindications: z.array(z.string()).optional(),
			primaryMuscles: z.array(z.string()).optional(),
			secondaryMuscles: z.array(z.string()).optional(),
			muscles: z
				.array(
					z.object({
						muscleGroup: z.string(),
						role: z.string(),
						activationWeight: z.number().int(),
					}),
				)
				.optional(),
			suggestedPrerequisiteSlugs: z.array(z.string()).optional(),
			sourceUrl: z.string().optional(),
		}),
	),
});

export type ExerciseCandidate = z.output<typeof ExerciseCandidateSchema>;

export function normalizeSlug(input: string): string {
	return input
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function normalizeNameKey(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isDuplicateExercise(
	candidate: Pick<ExerciseCandidate, "slug" | "name">,
	existingExercises: readonly { slug: string; name: string }[],
): boolean {
	const candidateSlug = normalizeSlug(candidate.slug);
	const candidateFromName = normalizeSlug(candidate.name);
	const candidateNameKey = normalizeNameKey(candidate.name);

	return existingExercises.some((ex) => {
		const existingSlug = normalizeSlug(ex.slug);
		const existingNameKey = normalizeNameKey(ex.name);
		return (
			existingSlug === candidateSlug ||
			existingSlug === candidateFromName ||
			existingNameKey === candidateNameKey
		);
	});
}
