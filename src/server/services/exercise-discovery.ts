import "server-only";
import { google } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";
import {
	ExerciseDiscoveryResponseSchema,
	isDuplicateExercise,
	normalizeSlug,
} from "@/lib/ai/exercise-schema";
import { db } from "@/lib/db";
import "@/lib/env";
import {
	DIFFICULTY_BAND_BY_LEVEL,
	isBeginnerLevel,
	isExerciseEligible,
	type MovementPattern,
} from "@/lib/exercises/eligibility";
import { assertCanGeneratePlan } from "@/server/services/plan-gate";

export const DAILY_DISCOVERY_LIMIT = 3;

export type DiscoveryResult =
	| { ok: true; addedCount: number; names: string[] }
	| {
			ok: false;
			reason: "beginner_restricted" | "rate_limited" | "empty" | "ai_error";
	  };

function formatDateKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export async function discoverExercisesForProfile(params: {
	userId: string;
	profile: {
		experienceLevel: "NONE" | "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
		equipment: string[];
		injuries: string[];
		onboardingCompletedAt: Date | null;
		disclaimerAcceptedAt: Date | null;
	};
	pattern: MovementPattern;
}): Promise<DiscoveryResult> {
	const { userId, profile, pattern } = params;
	assertCanGeneratePlan(profile);

	if (isBeginnerLevel(profile.experienceLevel)) {
		return { ok: false, reason: "beginner_restricted" };
	}

	const today = formatDateKey(new Date());
	const usedToday = await db.aiUsage.count({
		where: { userId, kind: "DISCOVERY", date: today, success: true },
	});
	if (usedToday >= DAILY_DISCOVERY_LIMIT) {
		return { ok: false, reason: "rate_limited" };
	}

	const existing = await db.exercise.findMany({
		select: { slug: true, name: true },
	});
	const band = DIFFICULTY_BAND_BY_LEVEL[profile.experienceLevel];
	const existingNames = existing.map((e) => e.name).join(", ");

	const searchPrompt = [
		`Find 2 real calisthenics/bodyweight exercises for movement pattern ${pattern}.`,
		`Target difficulty between ${band.min} and ${band.max} (out of 10).`,
		`Allowed equipment ONLY: ${profile.equipment.join(", ")}.`,
		profile.injuries.length > 0
			? `Must be safe and NOT contraindicated for injuries: ${profile.injuries.join(", ")}.`
			: "",
		`Do NOT duplicate any of these existing exercises: ${existingNames}.`,
		"Return exercise names, form cues, equipment needed, and reference URLs.",
	]
		.filter(Boolean)
		.join("\n");

	let totalTokens = 0;
	let groundingContext = "";
	let firstGroundUrl: string | undefined;

	try {
		const searchRes = await generateText({
			model: google("gemini-2.5-flash"),
			tools: {
				google_search: google.tools.googleSearch({}),
			},
			prompt: searchPrompt,
			abortSignal: AbortSignal.timeout(15_000),
		});
		groundingContext = searchRes.text;
		totalTokens += searchRes.usage?.totalTokens ?? 0;
		const firstSource = searchRes.sources?.[0];
		if (
			firstSource &&
			"url" in firstSource &&
			typeof firstSource.url === "string"
		) {
			firstGroundUrl = firstSource.url;
		}
	} catch {
		// Fall back to direct structured generation if search grounding fails/times out.
		groundingContext = searchPrompt;
	}

	try {
		const structured = await generateObject({
			model: google("gemini-2.5-flash"),
			schema: ExerciseDiscoveryResponseSchema,
			prompt: [
				`Normalize up to 2 calisthenics exercises for pattern ${pattern} from the research notes below.`,
				`Strict constraints:`,
				`- pattern MUST be "${pattern}"`,
				`- difficulty MUST be integer ${band.min}..${band.max}`,
				`- equipment values MUST be a subset of [${profile.equipment.join(", ")}] (or ["none"])`,
				`- contraindications MUST only use ["shoulder","wrist","elbow","lower_back","knee","other"]`,
				`- exclude any exercise matching: ${existingNames}`,
				`- cues must be 2 to 4 concise non-medical coaching cues`,
				"",
				"Research notes:",
				groundingContext,
			].join("\n"),
			abortSignal: AbortSignal.timeout(15_000),
		});

		totalTokens += structured.usage?.totalTokens ?? 0;

		const createdNames: string[] = [];
		const currentExisting = [...existing];

		for (const candidate of structured.object.exercises) {
			const normalized = {
				...candidate,
				slug: normalizeSlug(candidate.slug || candidate.name),
				pattern,
			};

			if (isDuplicateExercise(normalized, currentExisting)) continue;

			const eligible = isExerciseEligible(
				{ ...normalized, status: "UNVERIFIED" },
				profile,
			);
			if (!eligible) continue;

			await db.exercise.create({
				data: {
					slug: normalized.slug,
					name: normalized.name,
					pattern: normalized.pattern,
					difficulty: normalized.difficulty,
					equipment: normalized.equipment,
					measure: normalized.measure,
					cues: normalized.cues,
					contraindications: normalized.contraindications,
					status: "UNVERIFIED",
					source: "AI",
					sourceUrl: normalized.sourceUrl ?? firstGroundUrl ?? null,
					license: "AI-discovered (unverified)",
				},
			});

			currentExisting.push({ slug: normalized.slug, name: normalized.name });
			createdNames.push(normalized.name);
		}

		await db.aiUsage.create({
			data: {
				userId,
				kind: "DISCOVERY",
				date: today,
				tokens: totalTokens,
				success: true,
			},
		});

		if (createdNames.length === 0) {
			return { ok: false, reason: "empty" };
		}

		return { ok: true, addedCount: createdNames.length, names: createdNames };
	} catch {
		await db.aiUsage.create({
			data: {
				userId,
				kind: "DISCOVERY",
				date: today,
				tokens: totalTokens,
				success: false,
			},
		});
		return { ok: false, reason: "ai_error" };
	}
}
