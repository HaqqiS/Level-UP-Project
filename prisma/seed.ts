import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { SEED_EXERCISES } from "./seed-data/exercises";

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
	const idBySlug = new Map<string, string>();

	// Pass 1: upsert all exercises so every slug gets a stable ID.
	for (const ex of SEED_EXERCISES) {
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
				contraindications: ex.contraindications,
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
				contraindications: ex.contraindications,
				sourceUrl: ex.sourceUrl,
				license: ex.license,
			},
		});
		idBySlug.set(ex.slug, record.id);
	}

	// Pass 2: link progression chains.
	for (const ex of SEED_EXERCISES) {
		const id = idBySlug.get(ex.slug);
		const nextId = ex.nextSlug ? (idBySlug.get(ex.nextSlug) ?? null) : null;
		if (id && nextId) {
			await prisma.exercise.update({
				where: { id },
				data: { progressionNextId: nextId },
			});
		}
	}

	console.log(`Seeded ${SEED_EXERCISES.length} verified exercises.`);
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
