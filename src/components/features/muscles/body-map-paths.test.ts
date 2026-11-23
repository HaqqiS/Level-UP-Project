import { describe, expect, it } from "vitest";
import { MUSCLE_GROUPS } from "@/lib/exercises/muscles";
import { getBodyMapModel, resolveBodyMapGender } from "./body-map-paths";

describe("body-map-paths", () => {
	it("resolves user profile sex to male or female body map", () => {
		expect(resolveBodyMapGender("female")).toBe("female");
		expect(resolveBodyMapGender("male")).toBe("male");
		expect(resolveBodyMapGender("prefer_not")).toBe("male");
		expect(resolveBodyMapGender(null)).toBe("male");
		expect(resolveBodyMapGender(undefined)).toBe("male");
	});

	for (const gender of ["male", "female"] as const) {
		it(`covers all 26 muscle groups with valid clips and outlines (${gender})`, () => {
			const model = getBodyMapModel(gender);

			const parseViewBox = (vb: string) => vb.trim().split(/\s+/).map(Number);
			const [, , frontW, frontH] = parseViewBox(model.front.viewBox);
			const [, , backW, backH] = parseViewBox(model.back.viewBox);
			expect(frontW).toBe(backW);
			expect(frontH).toBe(backH);

			for (const side of ["front", "back"] as const) {
				const view = model[side];
				expect(view.outlinePaths.length).toBeGreaterThan(0);
				expect(view.silhouettePaths.length).toBeGreaterThan(0);

				const clipIds = new Set(view.clipRegions.map((clip) => clip.id));
				for (const region of view.muscleRegions) {
					expect(region.paths.length).toBeGreaterThan(0);
					for (const pathD of region.paths) {
						expect(pathD.length).toBeGreaterThan(0);
					}
					if (region.clipId) {
						expect(clipIds.has(region.clipId)).toBe(true);
					}
				}
			}

			const coveredMuscles = new Set([
				...model.front.muscleRegions.map((region) => region.muscle),
				...model.back.muscleRegions.map((region) => region.muscle),
			]);
			for (const muscle of MUSCLE_GROUPS) {
				expect(coveredMuscles.has(muscle)).toBe(true);
			}
			expect(coveredMuscles.size).toBe(MUSCLE_GROUPS.length);
		});
	}
});
