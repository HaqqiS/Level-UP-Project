import "server-only";
import {
	ExerciseCandidateSchema,
	ExerciseDiscoveryAiWireSchema,
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
import {
	buildDefaultMasteryBenchmarks,
	deriveMuscleCacheArrays,
	type ExerciseMuscleEntry,
	inferDefaultMusclesAndMastery,
	MUSCLE_GROUPS,
} from "@/lib/exercises/muscles";
import { wouldEdgeCreateCycle } from "@/lib/exercises/progression-dag";
import {
	generateGroundedSearchWithFallback,
	generateStructuredWithFallback,
} from "@/server/services/ai-client";
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

	const [existing, existingEdges] = await Promise.all([
		db.exercise.findMany({
			select: {
				id: true,
				slug: true,
				name: true,
				pattern: true,
				difficulty: true,
			},
		}),
		db.exerciseEdge.findMany({
			select: { fromExerciseId: true, toExerciseId: true },
		}),
	]);

	const band = DIFFICULTY_BAND_BY_LEVEL[profile.experienceLevel];
	const existingNames = existing.map((e) => e.name).join(", ");
	const prerequisitePool = existing
		.filter((e) => e.pattern === pattern && e.difficulty < band.max)
		.map((e) => `${e.slug} (diff ${e.difficulty})`)
		.slice(0, 25);

	const searchPrompt = [
		`Find 2 real calisthenics/bodyweight exercises for movement pattern ${pattern}.`,
		`Target difficulty between ${band.min} and ${band.max} (out of 10).`,
		`Allowed equipment ONLY: ${profile.equipment.join(", ")}.`,
		profile.injuries.length > 0
			? `Must be safe and NOT contraindicated for injuries: ${profile.injuries.join(", ")}.`
			: "",
		`Do NOT duplicate any of these existing exercises: ${existingNames}.`,
		"Return exercise names, form cues, equipment needed, primary/secondary/stabilizer muscles, and reference URLs.",
	]
		.filter(Boolean)
		.join("\n");

	let totalTokens = 0;
	let groundingContext = "";
	let firstGroundUrl: string | undefined;

	try {
		const searchRes = await generateGroundedSearchWithFallback({
			prompt: searchPrompt,
			label: "exercise-discovery",
		});
		groundingContext = searchRes.text;
		totalTokens += searchRes.tokens;
		firstGroundUrl = searchRes.firstGroundUrl;
	} catch (error) {
		console.warn(
			"[ai:exercise-discovery] search grounding failed, falling back to direct structured generation:",
			error,
		);
		// Fall back to direct structured generation if search grounding fails/times out.
		groundingContext = searchPrompt;
	}

	try {
		const structured = await generateStructuredWithFallback({
			schema: ExerciseDiscoveryAiWireSchema,
			label: "exercise-discovery",
			prompt: [
				`Normalize up to 2 calisthenics exercises for pattern ${pattern} from the research notes below.`,
				"Strict constraints:",
				`- pattern MUST be "${pattern}"`,
				`- difficulty MUST be integer ${band.min}..${band.max}`,
				`- equipment values MUST be a subset of [${profile.equipment.join(", ")}] (or ["none"])`,
				`- contraindications MUST only use ["shoulder","wrist","elbow","lower_back","knee","other"]`,
				`- muscles[] MUST specify anatomical regions from [${MUSCLE_GROUPS.join(", ")}] with role ("PRIMARY"|"SECONDARY"|"STABILIZER") and activationWeight (1..100)`,
				prerequisitePool.length > 0
					? `- suggestedPrerequisiteSlugs MAY pick 1-2 lower-difficulty prerequisite slugs from [${prerequisitePool.join(", ")}]`
					: "",
				`- exclude any exercise matching: ${existingNames}`,
				"- cues must be 2 to 4 concise non-medical coaching cues",
				"",
				"Research notes:",
				groundingContext,
			]
				.filter(Boolean)
				.join("\n"),
		});

		totalTokens += structured.tokens;

		const createdNames: string[] = [];
		const currentExisting = [...existing];
		const existingBySlug = new Map(existing.map((e) => [e.slug, e]));
		const dagEdges = existingEdges.map((e) => ({
			fromId: e.fromExerciseId,
			toId: e.toExerciseId,
		}));

		for (const rawCandidate of structured.object.exercises.slice(0, 3)) {
			const parsedCandidate = ExerciseCandidateSchema.safeParse({
				...rawCandidate,
				slug: normalizeSlug(rawCandidate.slug || rawCandidate.name),
				pattern,
			});
			if (!parsedCandidate.success) continue;
			const normalized = parsedCandidate.data;

			if (isDuplicateExercise(normalized, currentExisting)) continue;

			const eligible = isExerciseEligible(
				{ ...normalized, status: "UNVERIFIED" },
				profile,
			);
			if (!eligible) continue;

			const fallback = inferDefaultMusclesAndMastery(normalized);
			let resolvedMuscles: ExerciseMuscleEntry[];
			if (normalized.muscles.length > 0) {
				const deduped = new Map<string, ExerciseMuscleEntry>();
				for (const m of normalized.muscles) {
					if (!deduped.has(m.muscleGroup)) deduped.set(m.muscleGroup, m);
				}
				resolvedMuscles = [...deduped.values()];
			} else if (normalized.primaryMuscles.length > 0) {
				resolvedMuscles = [
					...normalized.primaryMuscles.map((m) => ({
						muscleGroup: m,
						role: "PRIMARY" as const,
						activationWeight: 90,
					})),
					...normalized.secondaryMuscles
						.filter((m) => !normalized.primaryMuscles.includes(m))
						.map((m) => ({
							muscleGroup: m,
							role: "SECONDARY" as const,
							activationWeight: 65,
						})),
				];
			} else {
				resolvedMuscles = fallback.muscles;
			}

			const cacheMuscles = deriveMuscleCacheArrays(resolvedMuscles);
			const benchmarks =
				normalized.masteryBenchmarks &&
				normalized.masteryBenchmarks.length === 3
					? normalized.masteryBenchmarks
					: buildDefaultMasteryBenchmarks(normalized);
			const silver =
				benchmarks.find((b) => b.tier === "SILVER") ?? benchmarks[0];

			await db.$transaction(async (tx) => {
				const created = await tx.exercise.create({
					data: {
						slug: normalized.slug,
						name: normalized.name,
						pattern: normalized.pattern,
						difficulty: normalized.difficulty,
						equipment: normalized.equipment,
						measure: normalized.measure,
						cues: normalized.cues,
						contraindications: normalized.contraindications,
						branchKey: `${normalized.pattern.toLowerCase()}-ai`,
						treeTier: Math.max(1, normalized.difficulty),
						primaryMuscles: cacheMuscles.primaryMuscles,
						secondaryMuscles: cacheMuscles.secondaryMuscles,
						masteryTargetSets: silver?.targetSets ?? fallback.masteryTargetSets,
						masteryTargetReps:
							silver?.targetReps ?? fallback.masteryTargetReps ?? null,
						masteryTargetSeconds:
							silver?.targetSeconds ?? fallback.masteryTargetSeconds ?? null,
						status: "UNVERIFIED",
						source: "AI",
						sourceUrl: normalized.sourceUrl ?? firstGroundUrl ?? null,
						license: "AI-discovered (unverified)",
					},
				});

				await tx.exerciseMuscle.createMany({
					data: resolvedMuscles.map((m) => ({
						exerciseId: created.id,
						muscleGroup: m.muscleGroup,
						role: m.role,
						activationWeight: m.activationWeight,
					})),
				});

				await tx.exerciseMasteryBenchmark.createMany({
					data: benchmarks.map((b) => ({
						exerciseId: created.id,
						tier: b.tier,
						targetSets: b.targetSets,
						targetReps: b.targetReps ?? null,
						targetSeconds: b.targetSeconds ?? null,
						minConsecutiveSessions: b.minConsecutiveSessions,
						maxRpe: b.maxRpe ?? null,
						tempo: b.tempo ?? null,
						formStandard: b.formStandard ?? null,
						unlocksNext: b.unlocksNext,
					})),
				});

				let order = 0;
				for (const prereqSlug of normalized.suggestedPrerequisiteSlugs) {
					const prereq = existingBySlug.get(normalizeSlug(prereqSlug));
					if (!prereq || prereq.difficulty >= normalized.difficulty) continue;
					if (wouldEdgeCreateCycle(dagEdges, prereq.id, created.id)) continue;

					await tx.exerciseEdge.create({
						data: {
							fromExerciseId: prereq.id,
							toExerciseId: created.id,
							kind: "PROGRESSION",
							branchLabel: "AI Discovered",
							requiredTier: "BRONZE",
							order,
						},
					});
					dagEdges.push({ fromId: prereq.id, toId: created.id });
					order += 1;
				}
			});

			currentExisting.push({
				id: normalized.slug,
				slug: normalized.slug,
				name: normalized.name,
				pattern: normalized.pattern,
				difficulty: normalized.difficulty,
			});
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
	} catch (error) {
		console.error("[ai:exercise-discovery] all AI models failed:", error);
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
