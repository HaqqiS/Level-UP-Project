import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { inferDefaultMusclesAndMastery } from "../src/lib/exercises/muscles";
import {
	computeTopologicalTiers,
	validateProgressionDag,
} from "../src/lib/exercises/progression-dag";
import {
	EXERCISE_MEDIA_BY_SLUG,
	SEED_EDGES,
	SEED_EXERCISES,
} from "./seed-data";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error(
		"DIRECT_URL or DATABASE_URL must be set to seed the database.",
	);
}

const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString }),
});

async function main() {
	const slugs = SEED_EXERCISES.map((ex) => ex.slug);
	const dagEdges = SEED_EDGES.map((e) => ({
		fromId: e.fromSlug,
		toId: e.toSlug,
	}));

	const dagCheck = validateProgressionDag(slugs, dagEdges);
	if (!dagCheck.ok) {
		throw new Error(
			`Invalid progression DAG in seed-data:\n${dagCheck.errors.join("\n")}`,
		);
	}

	const tiers = computeTopologicalTiers(slugs, dagEdges);
	const idBySlug = new Map<string, string>();
	let muscleCount = 0;
	let benchmarkCount = 0;

	// Pass 1: upsert exercises with synced cache fields + tree metadata
	for (const ex of SEED_EXERCISES) {
		const defaults = inferDefaultMusclesAndMastery(ex);
		const treeTier = tiers.get(ex.slug) ?? 1;
		const media = EXERCISE_MEDIA_BY_SLUG[ex.slug];
		const demoVideoId = media?.demoVideoId ?? ex.demoVideoId ?? null;
		const demoImages = media?.demoImages ?? ex.demoImages ?? [];

		const record = await prisma.exercise.upsert({
			where: { slug: ex.slug },
			create: {
				slug: ex.slug,
				name: ex.name,
				pattern: ex.pattern,
				difficulty: ex.difficulty,
				equipment: ex.equipment,
				measure: ex.measure,
				cues: ex.cues,
				demoVideoId,
				demoImages,
				contraindications: ex.contraindications,
				branchKey: ex.branchKey,
				treeTier,
				primaryMuscles: defaults.primaryMuscles,
				secondaryMuscles: defaults.secondaryMuscles,
				masteryTargetSets: defaults.masteryTargetSets,
				masteryTargetReps: defaults.masteryTargetReps,
				masteryTargetSeconds: defaults.masteryTargetSeconds,
				status: "VERIFIED",
				source: "SEED",
				sourceUrl: ex.sourceUrl,
				license: ex.license,
			},
			update: {
				name: ex.name,
				pattern: ex.pattern,
				difficulty: ex.difficulty,
				equipment: ex.equipment,
				measure: ex.measure,
				cues: ex.cues,
				demoVideoId,
				demoImages,
				contraindications: ex.contraindications,
				branchKey: ex.branchKey,
				treeTier,
				primaryMuscles: defaults.primaryMuscles,
				secondaryMuscles: defaults.secondaryMuscles,
				masteryTargetSets: defaults.masteryTargetSets,
				masteryTargetReps: defaults.masteryTargetReps,
				masteryTargetSeconds: defaults.masteryTargetSeconds,
				sourceUrl: ex.sourceUrl,
				license: ex.license,
			},
		});
		idBySlug.set(ex.slug, record.id);

		// Pass 2a: sync ExerciseMuscle rows
		const activeMuscleGroups = defaults.muscles.map((m) => m.muscleGroup);
		await prisma.exerciseMuscle.deleteMany({
			where: {
				exerciseId: record.id,
				muscleGroup: { notIn: activeMuscleGroups },
			},
		});
		for (const m of defaults.muscles) {
			await prisma.exerciseMuscle.upsert({
				where: {
					exerciseId_muscleGroup: {
						exerciseId: record.id,
						muscleGroup: m.muscleGroup,
					},
				},
				create: {
					exerciseId: record.id,
					muscleGroup: m.muscleGroup,
					role: m.role,
					activationWeight: m.activationWeight,
				},
				update: {
					role: m.role,
					activationWeight: m.activationWeight,
				},
			});
			muscleCount += 1;
		}

		// Pass 2b: upsert Bronze/Silver/Gold ExerciseMasteryBenchmark rows
		for (const bench of defaults.masteryBenchmarks) {
			await prisma.exerciseMasteryBenchmark.upsert({
				where: {
					exerciseId_tier: {
						exerciseId: record.id,
						tier: bench.tier,
					},
				},
				create: {
					exerciseId: record.id,
					tier: bench.tier,
					targetSets: bench.targetSets,
					targetReps: bench.targetReps ?? null,
					targetSeconds: bench.targetSeconds ?? null,
					minConsecutiveSessions: bench.minConsecutiveSessions,
					maxRpe: bench.maxRpe ?? null,
					tempo: bench.tempo ?? null,
					formStandard: bench.formStandard ?? null,
					unlocksNext: bench.unlocksNext,
				},
				update: {
					targetSets: bench.targetSets,
					targetReps: bench.targetReps ?? null,
					targetSeconds: bench.targetSeconds ?? null,
					minConsecutiveSessions: bench.minConsecutiveSessions,
					maxRpe: bench.maxRpe ?? null,
					tempo: bench.tempo ?? null,
					formStandard: bench.formStandard ?? null,
					unlocksNext: bench.unlocksNext,
				},
			});
			benchmarkCount += 1;
		}
	}

	// Pass 3: replace SEED edges cleanly & sync legacy progressionNextId
	const seededIds = [...idBySlug.values()];
	await prisma.exerciseEdge.deleteMany({
		where: {
			fromExerciseId: { in: seededIds },
			toExerciseId: { in: seededIds },
		},
	});

	for (const edge of SEED_EDGES) {
		const fromId = idBySlug.get(edge.fromSlug);
		const toId = idBySlug.get(edge.toSlug);
		if (!fromId || !toId) continue;
		await prisma.exerciseEdge.upsert({
			where: {
				fromExerciseId_toExerciseId: {
					fromExerciseId: fromId,
					toExerciseId: toId,
				},
			},
			create: {
				fromExerciseId: fromId,
				toExerciseId: toId,
				kind: edge.kind,
				branchLabel: edge.branchLabel ?? null,
				requiredTier: edge.requiredTier,
				order: edge.order,
			},
			update: {
				kind: edge.kind,
				branchLabel: edge.branchLabel ?? null,
				requiredTier: edge.requiredTier,
				order: edge.order,
			},
		});
	}

	// Sync legacy `progressionNextId` for backward compatibility
	for (const ex of SEED_EXERCISES) {
		const id = idBySlug.get(ex.slug);
		const primaryOutgoing = SEED_EDGES.find(
			(e) =>
				e.fromSlug === ex.slug && e.kind === "PROGRESSION" && e.order === 0,
		);
		const legacyNextSlug = primaryOutgoing?.toSlug ?? ex.nextSlug;
		const nextId = legacyNextSlug
			? (idBySlug.get(legacyNextSlug) ?? null)
			: null;
		if (id) {
			await prisma.exercise.update({
				where: { id },
				data: { progressionNextId: nextId },
			});
		}
	}

	console.log(
		`Seeded ${SEED_EXERCISES.length} verified exercises, ${muscleCount} anatomical muscle mappings, ${benchmarkCount} mastery benchmarks, and ${SEED_EDGES.length} DAG edges.`,
	);
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (error) => {
		console.error(error);
		await prisma.$disconnect();
		process.exit(1);
	});
