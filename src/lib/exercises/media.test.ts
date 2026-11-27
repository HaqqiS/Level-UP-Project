import { afterEach, describe, expect, it, vi } from "vitest";
import {
	buildSupabaseExerciseImageUrl,
	buildYouTubeEmbedUrl,
	buildYouTubeSearchUrl,
	buildYouTubeThumbnailUrl,
	buildYouTubeWatchUrl,
	EXERCISE_MEDIA_BUCKET,
	isValidDemoImageKey,
	isValidYouTubeVideoId,
	resolveExerciseDemoState,
	STORAGE_IMAGE_KEY_REGEX,
	YOUTUBE_VIDEO_ID_REGEX,
} from "./media";

describe("exercise demo media helpers", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	describe("constants and YouTube video ID validation", () => {
		it("exports the expected bucket name and regexes", () => {
			expect(EXERCISE_MEDIA_BUCKET).toBe("exercise-media");
			expect(YOUTUBE_VIDEO_ID_REGEX.test("dQw4w9WgXcQ")).toBe(true);
			expect(STORAGE_IMAGE_KEY_REGEX.test("push-up/01.webp")).toBe(true);
		});

		it("accepts valid 11-character YouTube video IDs", () => {
			expect(isValidYouTubeVideoId("dQw4w9WgXcQ")).toBe(true);
			expect(isValidYouTubeVideoId("aB3_dE6-gH9")).toBe(true);
			expect(isValidYouTubeVideoId("01234567890")).toBe(true);
		});

		it("rejects invalid YouTube video IDs", () => {
			expect(isValidYouTubeVideoId(null)).toBe(false);
			expect(isValidYouTubeVideoId(undefined)).toBe(false);
			expect(isValidYouTubeVideoId("")).toBe(false);
			expect(isValidYouTubeVideoId("short12345")).toBe(false);
			expect(isValidYouTubeVideoId("toolong12345")).toBe(false);
			expect(isValidYouTubeVideoId("dQw4w9WgX Q")).toBe(false);
			expect(isValidYouTubeVideoId("dQw4w9WgXc/")).toBe(false);
			expect(isValidYouTubeVideoId("dQw4w9WgXc?")).toBe(false);
			expect(
				isValidYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
			).toBe(false);
		});
	});

	describe("storage image key validation", () => {
		it("accepts valid slug/filename keys for supported image formats", () => {
			expect(isValidDemoImageKey("push-up/01.webp")).toBe(true);
			expect(isValidDemoImageKey("pull-up/start_position.jpg")).toBe(true);
			expect(isValidDemoImageKey("l-sit/step-2.jpeg")).toBe(true);
			expect(isValidDemoImageKey("dip/end_frame.PNG")).toBe(true);
		});

		it("rejects path traversal, extra segments, query strings, and unsafe extensions", () => {
			expect(isValidDemoImageKey("../push-up/01.webp")).toBe(false);
			expect(isValidDemoImageKey("push-up/../01.webp")).toBe(false);
			expect(isValidDemoImageKey("/push-up/01.webp")).toBe(false);
			expect(isValidDemoImageKey("push-up/sub/01.webp")).toBe(false);
			expect(isValidDemoImageKey("01.webp")).toBe(false);
			expect(isValidDemoImageKey("push-up/01.svg")).toBe(false);
			expect(isValidDemoImageKey("push-up/01.gif")).toBe(false);
			expect(isValidDemoImageKey("push-up/01.webp?token=abc")).toBe(false);
			expect(isValidDemoImageKey("push-up/01.webp#top")).toBe(false);
			expect(isValidDemoImageKey("push up/01.webp")).toBe(false);
			expect(isValidDemoImageKey("https://evil.test/a/b.webp")).toBe(false);
			expect(isValidDemoImageKey("")).toBe(false);
		});
	});

	describe("buildSupabaseExerciseImageUrl", () => {
		it("builds a public Supabase Storage URL and trims trailing slashes", () => {
			expect(
				buildSupabaseExerciseImageUrl(
					"push-up/01.webp",
					"https://demo.supabase.co",
				),
			).toBe(
				"https://demo.supabase.co/storage/v1/object/public/exercise-media/push-up/01.webp",
			);

			expect(
				buildSupabaseExerciseImageUrl(
					"push-up/02.jpg",
					"https://demo.supabase.co///",
				),
			).toBe(
				"https://demo.supabase.co/storage/v1/object/public/exercise-media/push-up/02.jpg",
			);
		});

		it("falls back to NEXT_PUBLIC_SUPABASE_URL when supabaseUrl is omitted", () => {
			vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://env.supabase.co/");
			expect(buildSupabaseExerciseImageUrl("plank/01.png")).toBe(
				"https://env.supabase.co/storage/v1/object/public/exercise-media/plank/01.png",
			);
		});

		it("returns null when supabaseUrl is missing, empty, or invalid", () => {
			vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
			expect(buildSupabaseExerciseImageUrl("push-up/01.webp")).toBeNull();
			expect(buildSupabaseExerciseImageUrl("push-up/01.webp", "")).toBeNull();
			expect(
				buildSupabaseExerciseImageUrl("push-up/01.webp", "   "),
			).toBeNull();
			expect(
				buildSupabaseExerciseImageUrl("push-up/01.webp", "javascript:alert(1)"),
			).toBeNull();
			expect(
				buildSupabaseExerciseImageUrl("push-up/01.webp", "not-a-url"),
			).toBeNull();
			expect(
				buildSupabaseExerciseImageUrl(
					"push-up/01.webp",
					"http://demo.supabase.co",
				),
			).toBeNull();
			expect(
				buildSupabaseExerciseImageUrl(
					"push-up/01.webp",
					"http://127.0.0.1:54321",
				),
			).toBe(
				"http://127.0.0.1:54321/storage/v1/object/public/exercise-media/push-up/01.webp",
			);
		});

		it("returns null for invalid or path-traversal keys", () => {
			expect(
				buildSupabaseExerciseImageUrl(
					"../secret/01.webp",
					"https://demo.supabase.co",
				),
			).toBeNull();
			expect(
				buildSupabaseExerciseImageUrl(
					"push-up/01.svg",
					"https://demo.supabase.co",
				),
			).toBeNull();
		});
	});

	describe("YouTube URL builders", () => {
		it("builds thumbnail, privacy-enhanced embed, and watch URLs", () => {
			expect(buildYouTubeThumbnailUrl("dQw4w9WgXcQ")).toBe(
				"https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
			);
			expect(buildYouTubeEmbedUrl("dQw4w9WgXcQ")).toBe(
				"https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1&playsinline=1&autoplay=1",
			);
			expect(buildYouTubeWatchUrl("dQw4w9WgXcQ")).toBe(
				"https://www.youtube.com/watch?v=dQw4w9WgXcQ",
			);
		});

		it("properly URL-encodes exercise names in search URLs", () => {
			expect(buildYouTubeSearchUrl("Archer Push-Up & Dip / Hold")).toBe(
				`https://www.youtube.com/results?search_query=${encodeURIComponent(
					"Archer Push-Up & Dip / Hold calisthenics proper form tutorial",
				)}`,
			);
		});
	});

	describe("resolveExerciseDemoState", () => {
		const baseUrl = "https://demo.supabase.co/";

		it("resolves photos + video state with defaultMode 'photos'", () => {
			const state = resolveExerciseDemoState(
				{
					name: "Push-Up",
					demoVideoId: "dQw4w9WgXcQ",
					demoImages: ["push-up/01.webp", "push-up/02.webp"],
				},
				baseUrl,
			);

			expect(state).toEqual({
				hasImages: true,
				hasVideo: true,
				defaultMode: "photos",
				imageUrls: [
					"https://demo.supabase.co/storage/v1/object/public/exercise-media/push-up/01.webp",
					"https://demo.supabase.co/storage/v1/object/public/exercise-media/push-up/02.webp",
				],
				videoId: "dQw4w9WgXcQ",
				searchUrl: buildYouTubeSearchUrl("Push-Up"),
			});
		});

		it("resolves photos-only state with defaultMode 'photos'", () => {
			const state = resolveExerciseDemoState(
				{
					name: "Pull-Up",
					demoVideoId: null,
					demoImages: ["pull-up/01.webp"],
				},
				baseUrl,
			);

			expect(state).toEqual({
				hasImages: true,
				hasVideo: false,
				defaultMode: "photos",
				imageUrls: [
					"https://demo.supabase.co/storage/v1/object/public/exercise-media/pull-up/01.webp",
				],
				videoId: null,
				searchUrl: buildYouTubeSearchUrl("Pull-Up"),
			});
		});

		it("resolves video-only state with defaultMode 'video'", () => {
			const state = resolveExerciseDemoState(
				{
					name: "Hollow Body Hold",
					demoVideoId: "aB3_dE6-gH9",
					demoImages: [],
				},
				baseUrl,
			);

			expect(state).toEqual({
				hasImages: false,
				hasVideo: true,
				defaultMode: "video",
				imageUrls: [],
				videoId: "aB3_dE6-gH9",
				searchUrl: buildYouTubeSearchUrl("Hollow Body Hold"),
			});
		});

		it("resolves search fallback state when neither photos nor video are valid", () => {
			const state = resolveExerciseDemoState(
				{
					name: "Dragon Flag",
					demoVideoId: "invalid",
					demoImages: ["../unsafe/01.webp"],
				},
				baseUrl,
			);

			expect(state).toEqual({
				hasImages: false,
				hasVideo: false,
				defaultMode: "search",
				imageUrls: [],
				videoId: null,
				searchUrl: buildYouTubeSearchUrl("Dragon Flag"),
			});
		});

		it("filters out invalid image keys and falls back to video when supabaseUrl is missing", () => {
			const filtered = resolveExerciseDemoState(
				{
					name: "Dip",
					demoVideoId: "dQw4w9WgXcQ",
					demoImages: ["../bad.webp", "dip/01.jpg", "dip/02.svg"],
				},
				baseUrl,
			);
			expect(filtered.imageUrls).toEqual([
				"https://demo.supabase.co/storage/v1/object/public/exercise-media/dip/01.jpg",
			]);
			expect(filtered.defaultMode).toBe("photos");

			vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
			const noSupabase = resolveExerciseDemoState({
				name: "Dip",
				demoVideoId: "dQw4w9WgXcQ",
				demoImages: ["dip/01.jpg"],
			});
			expect(noSupabase.hasImages).toBe(false);
			expect(noSupabase.hasVideo).toBe(true);
			expect(noSupabase.defaultMode).toBe("video");
		});
	});
});
