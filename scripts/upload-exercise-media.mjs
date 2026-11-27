import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const BUCKET = "exercise-media";
const FREE_EX_DB_JSON_URL =
	"https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const FREE_EX_DB_IMAGE_BASE =
	"https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

/**
 * Explicit, manually audited mapping from our curated exercise slugs to
 * genuinely matching bodyweight/calisthenics entries in `yuhonas/free-exercise-db`
 * (Unlicense / Public Domain). Never fuzzy-match unrelated barbell/machine entries.
 */
export const FREE_EXERCISE_DB_MAP = {
	// Foundations & Mobility
	"supine-pelvic-tilt": "Pelvic_Tilt_Into_Bridge",
	"neck-shoulder-circles": "Shoulder_Circles",
	"cat-cow-spine": "Cat_Stretch",
	"childs-pose-reach": "Childs_Pose",
	"wrist-warm-up": "Kneeling_Forearm_Stretch",
	"shoulder-dislocates-band": "Round_The_World_Shoulder_Stretch",
	"pancake-stretch": "The_Straddle",

	// Push
	"incline-pushup": "Incline_Push-Up",
	pushup: "Pushups",
	"wide-pushup": "Push-Up_Wide",
	"diamond-pushup": "Push-Ups_-_Close_Triceps_Position",
	"decline-pushup": "Decline_Push-Up",
	"one-arm-pushup": "Single-Arm_Push-Up",
	"bench-dip": "Bench_Dips",
	"parallel-bar-dip": "Parallel_Bar_Dip",
	"ring-dip": "Ring_Dips",
	"wall-hspu": "Handstand_Push-Ups",

	// Pull
	"scapular-pull": "Scapular_Pull-Up",
	"incline-bodyweight-row": "Suspended_Row",
	"australian-pullup": "Inverted_Row",
	"band-assisted-pullup": "Band_Assisted_Pull-Up",
	chinup: "Chin-Up",
	pullup: "Pullups",
	"assisted-one-arm-pullup": "One_Arm_Chin-Up",
	"ring-muscle-up": "Muscle_Up",

	// Legs
	"bodyweight-squat": "Bodyweight_Squat",
	"glute-bridge": "Butt_Lift_Bridge",
	"single-leg-glute-bridge": "Single_Leg_Glute_Bridge",
	"sliding-leg-curl": "Platform_Hamstring_Slides",
	"nordic-hamstring-negative": "Floor_Glute-Ham_Raise",

	// Core
	"dead-bug": "Dead_Bug",
	plank: "Plank",
	"hanging-leg-raise": "Hanging_Leg_Raise",
	"toes-to-bar": "Hanging_Pike",
	"side-plank": "Side_Bridge",
};

function resolveSupabaseUrl() {
	const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
	if (raw && /^https?:\/\//i.test(raw)) {
		return raw.replace(/\/+$/, "");
	}
	const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";
	const match = dbUrl.match(/postgres\.([a-z0-9]+):/i);
	if (match) {
		console.warn(
			`[warn] NEXT_PUBLIC_SUPABASE_URL is missing or not an HTTP URL; derived https://${match[1]}.supabase.co from DIRECT_URL/DATABASE_URL. Set NEXT_PUBLIC_SUPABASE_URL=https://${match[1]}.supabase.co in .env for the web app.`,
		);
		return `https://${match[1]}.supabase.co`;
	}
	throw new Error(
		"NEXT_PUBLIC_SUPABASE_URL must be set to a valid https://<project-ref>.supabase.co URL.",
	);
}

async function uploadExerciseImages(supabase) {
	console.log("Fetching free-exercise-db catalog...");
	const res = await fetch(FREE_EX_DB_JSON_URL);
	if (!res.ok) {
		throw new Error(
			`Failed to fetch free-exercise-db JSON: HTTP ${res.status}`,
		);
	}
	const catalog = await res.json();
	const byId = new Map(catalog.map((item) => [item.id, item]));

	const entries = Object.entries(FREE_EXERCISE_DB_MAP);
	let uploadedImages = 0;
	let uploadedExercises = 0;

	for (const [slug, freeExId] of entries) {
		const entry = byId.get(freeExId);
		if (!entry) {
			throw new Error(
				`free-exercise-db ID not found: ${freeExId} (for ${slug})`,
			);
		}
		const images = (entry.images ?? []).slice(0, 2);
		if (images.length < 2) {
			throw new Error(
				`Expected 2 images for ${freeExId} (${slug}), found ${images.length}`,
			);
		}

		for (let i = 0; i < images.length; i += 1) {
			const imgUrl = `${FREE_EX_DB_IMAGE_BASE}/${images[i]}`;
			const imgRes = await fetch(imgUrl);
			if (!imgRes.ok) {
				throw new Error(`Failed to download ${imgUrl}: HTTP ${imgRes.status}`);
			}
			const rawBuffer = Buffer.from(await imgRes.arrayBuffer());
			const webpBuffer = await sharp(rawBuffer)
				.resize({ width: 640, withoutEnlargement: true })
				.webp({ quality: 78 })
				.toBuffer();

			const storageKey = `${slug}/${i}.webp`;
			const { error } = await supabase.storage
				.from(BUCKET)
				.upload(storageKey, webpBuffer, {
					contentType: "image/webp",
					cacheControl: "31536000",
					upsert: true,
				});

			if (error) {
				throw new Error(
					`Failed to upload ${storageKey} to bucket ${BUCKET}: ${error.message}`,
				);
			}
			uploadedImages += 1;
		}
		uploadedExercises += 1;
		console.log(`  [ok] ${slug} <- ${freeExId} (0.webp, 1.webp)`);
	}

	console.log(
		`Uploaded ${uploadedImages} WebP images across ${uploadedExercises} exercises to Supabase Storage bucket "${BUCKET}".`,
	);
	return { uploadedExercises, uploadedImages };
}

async function verifyCuratedYouTubeVideos() {
	const mediaPath = path.join(process.cwd(), "prisma/seed-data/media.ts");
	const source = await readFile(mediaPath, "utf8");
	const regex = /demoVideoId:\s*"([A-Za-z0-9_-]{11})"/g;
	const ids = [];
	let match = regex.exec(source);
	while (match !== null) {
		ids.push(match[1]);
		match = regex.exec(source);
	}

	const uniqueIds = [...new Set(ids)];
	console.log(
		`Verifying ${ids.length} curated demoVideoId entries (${uniqueIds.length} unique IDs) via YouTube oEmbed...`,
	);

	const failures = [];
	const concurrency = 6;
	for (let i = 0; i < uniqueIds.length; i += concurrency) {
		const chunk = uniqueIds.slice(i, i + concurrency);
		await Promise.all(
			chunk.map(async (videoId) => {
				const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
				const res = await fetch(oembedUrl);
				if (!res.ok) {
					failures.push({ videoId, status: res.status });
					return;
				}
				const json = await res.json();
				console.log(
					`  [oembed 200] ${videoId} — ${json.author_name}: ${json.title}`,
				);
			}),
		);
	}

	if (failures.length > 0) {
		throw new Error(
			`YouTube oEmbed verification failed for ${failures.length} video(s): ${JSON.stringify(failures)}`,
		);
	}

	console.log(
		`Verified ${ids.length} curated YouTube video mappings (${uniqueIds.length} unique video IDs) — all returned HTTP 200.`,
	);
	return { totalMappings: ids.length, uniqueIds: uniqueIds.length };
}

async function main() {
	const verifyOnly = process.argv.includes("--verify-only");

	if (!verifyOnly) {
		const supabaseUrl = resolveSupabaseUrl();
		const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
		if (!serviceRoleKey) {
			throw new Error("SUPABASE_SERVICE_ROLE_KEY must be set in .env.");
		}
		const supabase = createClient(supabaseUrl, serviceRoleKey, {
			auth: { persistSession: false },
		});
		await uploadExerciseImages(supabase);
	}

	await verifyCuratedYouTubeVideos();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
