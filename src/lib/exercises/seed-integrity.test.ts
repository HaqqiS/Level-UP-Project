import { describe, expect, it } from "vitest";
import {
	EXERCISE_MEDIA_BY_SLUG,
	SEED_EDGES,
	SEED_EXERCISES,
} from "../../../prisma/seed-data";
import { inferDefaultMusclesAndMastery, MUSCLE_GROUPS } from "./muscles";
import { validateProgressionDag } from "./progression-dag";

const LEGACY_59_SLUGS = [
	"wall-pushup",
	"incline-pushup",
	"knee-pushup",
	"pushup",
	"diamond-pushup",
	"decline-pushup",
	"archer-pushup",
	"pseudo-planche-pushup",
	"one-arm-pushup",
	"bench-dip",
	"band-assisted-dip",
	"parallel-bar-dip",
	"ring-dip",
	"pike-pushup",
	"elevated-pike-pushup",
	"dead-hang",
	"scapular-pull",
	"incline-bodyweight-row",
	"australian-pullup",
	"negative-pullup",
	"band-assisted-pullup",
	"chinup",
	"pullup",
	"chest-to-bar-pullup",
	"archer-pullup",
	"typewriter-pullup",
	"assisted-squat",
	"bodyweight-squat",
	"split-squat",
	"bulgarian-split-squat",
	"cossack-squat",
	"assisted-pistol-squat",
	"shrimp-squat",
	"pistol-squat",
	"glute-bridge",
	"single-leg-glute-bridge",
	"nordic-hamstring-negative",
	"dead-bug",
	"knee-plank",
	"plank",
	"hollow-body-tuck",
	"hollow-body-hold",
	"dragon-flag-tuck",
	"hanging-knee-raise",
	"hanging-leg-raise",
	"toes-to-bar",
	"crow-pose",
	"wall-handstand-hold",
	"freestanding-handstand",
	"tuck-front-lever",
	"advanced-tuck-front-lever",
	"l-sit-tuck",
	"l-sit",
	"tuck-planche",
	"bar-muscle-up",
	"wrist-warm-up",
	"shoulder-dislocates-band",
	"deep-squat-hold",
	"thoracic-bridge-reach",
] as const;

describe("expanded curated seed catalog & DAG integrity", () => {
	it("contains 116 exercises (98 existing + 18 zero-equipment foundations), zero duplicate slugs, and preserves all 59 legacy slugs", () => {
		expect(SEED_EXERCISES).toHaveLength(116);
		const slugs = SEED_EXERCISES.map((ex) => ex.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		for (const legacySlug of LEGACY_59_SLUGS) {
			expect(slugs).toContain(legacySlug);
		}
	});

	it("gives every exercise valid 26-region muscles and ascending Bronze/Silver/Gold mastery tiers", () => {
		const validMuscleSet = new Set<string>(MUSCLE_GROUPS);

		for (const ex of SEED_EXERCISES) {
			expect(ex.muscles.length).toBeGreaterThanOrEqual(1);
			expect(ex.muscles.some((m) => m.role === "PRIMARY")).toBe(true);

			const seenMuscles = new Set<string>();
			for (const m of ex.muscles) {
				expect(validMuscleSet.has(m.muscleGroup)).toBe(true);
				expect(seenMuscles.has(m.muscleGroup)).toBe(false);
				seenMuscles.add(m.muscleGroup);
				expect(m.activationWeight).toBeGreaterThanOrEqual(1);
				expect(m.activationWeight).toBeLessThanOrEqual(100);
			}

			const defaults = inferDefaultMusclesAndMastery(ex);
			expect(defaults.masteryBenchmarks).toHaveLength(3);
			const bronze = defaults.masteryBenchmarks[0];
			const silver = defaults.masteryBenchmarks[1];
			const gold = defaults.masteryBenchmarks[2];
			expect(bronze?.tier).toBe("BRONZE");
			expect(silver?.tier).toBe("SILVER");
			expect(gold?.tier).toBe("GOLD");

			if (ex.measure === "REPS") {
				expect(bronze?.targetReps ?? 0).toBeLessThan(silver?.targetReps ?? 0);
				expect(silver?.targetReps ?? 0).toBeLessThanOrEqual(
					gold?.targetReps ?? 0,
				);
			} else {
				expect(bronze?.targetSeconds ?? 0).toBeLessThan(
					silver?.targetSeconds ?? 0,
				);
				expect(silver?.targetSeconds ?? 0).toBeLessThan(
					gold?.targetSeconds ?? 0,
				);
			}
		}
	});

	it("forms a valid acyclic DAG with both branching and converging progressions", () => {
		const slugs = SEED_EXERCISES.map((e) => e.slug);
		const edges = SEED_EDGES.map((e) => ({
			fromId: e.fromSlug,
			toId: e.toSlug,
		}));
		const res = validateProgressionDag(slugs, edges);
		expect(res).toEqual({ ok: true, errors: [] });

		const outDegree = new Map<string, number>();
		const inDegree = new Map<string, number>();
		for (const e of edges) {
			outDegree.set(e.fromId, (outDegree.get(e.fromId) ?? 0) + 1);
			inDegree.set(e.toId, (inDegree.get(e.toId) ?? 0) + 1);
		}
		expect([...outDegree.values()].some((d) => d > 1)).toBe(true);
		expect([...inDegree.values()].some((d) => d > 1)).toBe(true);
	});

	it("wires valid curated exercise media keys, YouTube IDs, and Supabase Storage image paths", () => {
		const slugSet = new Set(SEED_EXERCISES.map((ex) => ex.slug));
		const youtubeIdRegex = /^[A-Za-z0-9_-]{11}$/;
		const storageImageKeyRegex =
			/^[a-z0-9-]+\/[a-z0-9_-]+\.(webp|jpg|jpeg|png)$/i;

		const mediaEntries = Object.entries(EXERCISE_MEDIA_BY_SLUG);
		expect(mediaEntries.length).toBeGreaterThanOrEqual(40);

		for (const [slug, media] of mediaEntries) {
			expect(slugSet.has(slug)).toBe(true);
			expect(
				Boolean(media.demoVideoId) || (media.demoImages?.length ?? 0) > 0,
			).toBe(true);

			if (media.demoVideoId !== undefined) {
				expect(media.demoVideoId).toMatch(youtubeIdRegex);
			}
			if (media.demoImages !== undefined) {
				expect(media.demoImages.length).toBeGreaterThanOrEqual(1);
				for (const key of media.demoImages) {
					expect(key).toMatch(storageImageKeyRegex);
				}
			}
		}
	});
});
