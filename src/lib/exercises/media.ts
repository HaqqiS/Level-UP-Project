export const EXERCISE_MEDIA_BUCKET = "exercise-media";

export const YOUTUBE_VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

export const STORAGE_IMAGE_KEY_REGEX =
	/^[a-z0-9-]+\/[a-z0-9_-]+\.(webp|jpg|jpeg|png)$/i;

export type ExerciseDemoMode = "photos" | "video" | "search";

export type ExerciseDemoState = {
	hasImages: boolean;
	hasVideo: boolean;
	defaultMode: ExerciseDemoMode;
	imageUrls: string[];
	videoId: string | null;
	searchUrl: string;
};

export function isValidYouTubeVideoId(
	id: string | null | undefined,
): id is string {
	return typeof id === "string" && YOUTUBE_VIDEO_ID_REGEX.test(id);
}

export function isValidDemoImageKey(key: string): boolean {
	return STORAGE_IMAGE_KEY_REGEX.test(key);
}

export function buildSupabaseExerciseImageUrl(
	key: string,
	supabaseUrl?: string,
): string | null {
	if (!isValidDemoImageKey(key)) {
		return null;
	}

	const rawBase = supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
	if (!rawBase) {
		return null;
	}

	const base = rawBase.trim().replace(/\/+$/, "");
	if (!base) {
		return null;
	}

	try {
		const parsed = new URL(base);
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
			return null;
		}
	} catch {
		return null;
	}

	return `${base}/storage/v1/object/public/${encodeURIComponent(EXERCISE_MEDIA_BUCKET)}/${key}`;
}

export function buildYouTubeThumbnailUrl(videoId: string): string {
	return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function buildYouTubeEmbedUrl(videoId: string): string {
	return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&autoplay=1`;
}

export function buildYouTubeWatchUrl(videoId: string): string {
	return `https://www.youtube.com/watch?v=${videoId}`;
}

export function buildYouTubeSearchUrl(exerciseName: string): string {
	return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${exerciseName} calisthenics proper form tutorial`)}`;
}

export function resolveExerciseDemoState(
	exercise: {
		name: string;
		demoVideoId?: string | null;
		demoImages?: readonly string[] | null;
	},
	supabaseUrl?: string,
): ExerciseDemoState {
	const imageUrls = (exercise.demoImages ?? [])
		.map((key) => buildSupabaseExerciseImageUrl(key, supabaseUrl))
		.filter((url): url is string => url !== null);

	const videoId = isValidYouTubeVideoId(exercise.demoVideoId)
		? exercise.demoVideoId
		: null;

	const hasImages = imageUrls.length > 0;
	const hasVideo = videoId !== null;
	const defaultMode: ExerciseDemoMode = hasImages
		? "photos"
		: hasVideo
			? "video"
			: "search";

	return {
		hasImages,
		hasVideo,
		defaultMode,
		imageUrls,
		videoId,
		searchUrl: buildYouTubeSearchUrl(exercise.name),
	};
}
