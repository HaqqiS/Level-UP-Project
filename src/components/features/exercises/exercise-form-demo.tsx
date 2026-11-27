"use client";

import {
	ExternalLink,
	Images,
	Pause,
	Play,
	RotateCcw,
	SkipForward,
	WifiOff,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/reui/badge";
import { IconTile } from "@/components/reui/icon-tile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	buildYouTubeEmbedUrl,
	buildYouTubeThumbnailUrl,
	buildYouTubeWatchUrl,
	resolveExerciseDemoState,
} from "@/lib/exercises/media";

const FRAME_INTERVAL_MS = 1400;

type ActiveDemoMode = "photos" | "video";

export type ExerciseFormDemoProps = {
	exercise: {
		id: string;
		name: string;
		demoVideoId?: string | null;
		demoImages?: string[];
	};
};

export function ExerciseFormDemo({ exercise }: ExerciseFormDemoProps) {
	const t = useTranslations();
	const demo = resolveExerciseDemoState(exercise);
	const initialMode: ActiveDemoMode =
		demo.defaultMode === "video" ? "video" : "photos";

	const [mode, setMode] = useState<ActiveDemoMode>(initialMode);
	const [frameIndex, setFrameIndex] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [videoLoaded, setVideoLoaded] = useState(false);
	const [imageError, setImageError] = useState(false);
	const [imageLoaded, setImageLoaded] = useState(false);
	const [retryNonce, setRetryNonce] = useState(0);
	const [isOnline, setIsOnline] = useState(true);

	useEffect(() => {
		setIsOnline(navigator.onLine);
		const handleOnline = () => setIsOnline(true);
		const handleOffline = () => setIsOnline(false);
		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);
		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	useEffect(() => {
		if (!exercise.id) return;
		const nextMode: ActiveDemoMode =
			demo.defaultMode === "video" ? "video" : "photos";
		setMode(nextMode);
		setFrameIndex(0);
		setVideoLoaded(false);
		setImageError(false);
		setImageLoaded(false);
		setRetryNonce(0);

		const prefersReduced =
			typeof window !== "undefined" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		setIsPlaying(!prefersReduced && demo.imageUrls.length > 1);
	}, [exercise.id, demo.defaultMode, demo.imageUrls.length]);

	useEffect(() => {
		if (
			!demo.hasImages ||
			mode !== "photos" ||
			!isPlaying ||
			imageError ||
			demo.imageUrls.length <= 1
		) {
			return;
		}
		const intervalId = window.setInterval(() => {
			setFrameIndex((prev) => (prev + 1) % demo.imageUrls.length);
		}, FRAME_INTERVAL_MS);
		return () => window.clearInterval(intervalId);
	}, [demo.hasImages, demo.imageUrls.length, imageError, isPlaying, mode]);

	const handleImgRef = useCallback((node: HTMLImageElement | null) => {
		if (node?.complete && node.naturalWidth > 0) {
			setImageLoaded(true);
			setImageError(false);
		}
	}, []);

	const handleRetryImage = () => {
		setImageError(false);
		setImageLoaded(false);
		setRetryNonce((prev) => prev + 1);
	};

	const safeFrameIndex =
		demo.imageUrls.length > 0 ? frameIndex % demo.imageUrls.length : 0;
	const currentImageUrl = demo.imageUrls[safeFrameIndex];
	const hasMultipleFrames = demo.imageUrls.length > 1;
	const frameLabel =
		safeFrameIndex === 0
			? t("exercises.demo.startPosition")
			: safeFrameIndex === 1
				? t("exercises.demo.endPosition")
				: `${safeFrameIndex + 1}/${demo.imageUrls.length}`;

	const showPhotos = demo.hasImages && mode === "photos";
	const showVideo = demo.hasVideo && mode === "video";
	const showSearchOnly = !demo.hasImages && !demo.hasVideo;

	return (
		<section className="flex flex-col gap-2.5">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h3 className="text-sm font-semibold">{t("exercises.demo.title")}</h3>
				{demo.hasImages && demo.hasVideo && (
					<ToggleGroup
						variant="outline"
						size="sm"
						value={[mode]}
						onValueChange={(values) => {
							const next = values[0];
							if (next === "photos" || next === "video") {
								setMode(next);
								if (next !== "video") {
									setVideoLoaded(false);
								}
							}
						}}
					>
						<ToggleGroupItem value="photos">
							<Images aria-hidden="true" />
							{t("exercises.demo.photosTab")}
						</ToggleGroupItem>
						<ToggleGroupItem value="video">
							<Play aria-hidden="true" />
							{t("exercises.demo.videoTab")}
						</ToggleGroupItem>
					</ToggleGroup>
				)}
			</div>

			{showPhotos && currentImageUrl && (
				<div className="flex flex-col gap-2">
					<div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-muted/50">
						{imageError ? (
							<div
								role="status"
								className="flex flex-col items-center justify-center gap-3 p-4 text-center"
							>
								<p className="text-xs text-muted-foreground">
									{t("exercises.demo.loadError")}
								</p>
								<div className="flex flex-wrap items-center justify-center gap-2">
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={handleRetryImage}
									>
										<RotateCcw aria-hidden="true" />
										{t("exercises.demo.retry")}
									</Button>
									<Button
										nativeButton={false}
										size="sm"
										variant="ghost"
										render={
											<a
												href={demo.searchUrl}
												target="_blank"
												rel="noopener noreferrer"
											>
												<ExternalLink aria-hidden="true" />
												{t("exercises.demo.watchOnYoutube")}
											</a>
										}
									/>
								</div>
							</div>
						) : (
							<>
								{!imageLoaded && (
									<Skeleton className="absolute inset-0 size-full rounded-none" />
								)}
								{/* biome-ignore lint/performance/noImgElement: Direct Supabase Storage WebP URL cached offline by Serwist CacheFirst */}
								<img
									key={`${exercise.id}-${retryNonce}`}
									ref={handleImgRef}
									src={currentImageUrl}
									alt={`${exercise.name} — ${frameLabel}`}
									crossOrigin="anonymous"
									loading="lazy"
									decoding="async"
									onLoad={() => {
										setImageLoaded(true);
										setImageError(false);
									}}
									onError={() => {
										setImageError(true);
										setImageLoaded(true);
									}}
									className="size-full object-contain"
								/>
							</>
						)}
					</div>

					{!imageError && (
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div className="flex flex-wrap items-center gap-1.5">
								<Badge variant="secondary" className="tabular-nums">
									{frameLabel}
								</Badge>
								{hasMultipleFrames && (
									<>
										<Button
											type="button"
											size="sm"
											variant="ghost"
											onClick={() => setIsPlaying((prev) => !prev)}
										>
											{isPlaying ? (
												<Pause aria-hidden="true" />
											) : (
												<Play aria-hidden="true" />
											)}
											{isPlaying
												? t("exercises.demo.pausePreview")
												: t("exercises.demo.playPreview")}
										</Button>
										<Button
											type="button"
											size="sm"
											variant="ghost"
											onClick={() => {
												setIsPlaying(false);
												setFrameIndex(
													(prev) => (prev + 1) % demo.imageUrls.length,
												);
											}}
										>
											<SkipForward aria-hidden="true" />
											{t("exercises.demo.nextFrame")}
										</Button>
									</>
								)}
							</div>
							{!demo.hasVideo && (
								<Button
									nativeButton={false}
									size="sm"
									variant="ghost"
									render={
										<a
											href={demo.searchUrl}
											target="_blank"
											rel="noopener noreferrer"
										>
											<ExternalLink aria-hidden="true" />
											{t("exercises.demo.watchOnYoutube")}
										</a>
									}
								/>
							)}
						</div>
					)}
				</div>
			)}

			{showVideo && demo.videoId && (
				<div className="flex flex-col gap-2">
					{!isOnline ? (
						<div
							role="status"
							className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/50 p-3"
						>
							<div className="flex min-w-0 items-center gap-2.5">
								<IconTile variant="soft" size="sm">
									<WifiOff aria-hidden="true" />
								</IconTile>
								<p className="text-xs text-muted-foreground">
									{t("exercises.demo.offlineVideoNotice")}
								</p>
							</div>
							{demo.hasImages && (
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() => {
										setMode("photos");
										setVideoLoaded(false);
									}}
								>
									{t("exercises.demo.switchToPhotos")}
								</Button>
							)}
						</div>
					) : (
						<>
							<div className="relative aspect-video overflow-hidden rounded-2xl bg-muted/50">
								{videoLoaded ? (
									<iframe
										src={buildYouTubeEmbedUrl(demo.videoId)}
										title={exercise.name}
										className="size-full border-0"
										allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
										allowFullScreen
									/>
								) : (
									<>
										{/* biome-ignore lint/performance/noImgElement: External YouTube thumbnail facade without Next image proxy */}
										<img
											src={buildYouTubeThumbnailUrl(demo.videoId)}
											alt={exercise.name}
											loading="lazy"
											decoding="async"
											className="size-full object-cover"
										/>
										<div className="absolute inset-0 flex items-center justify-center bg-black/30">
											<Button
												type="button"
												size="icon-lg"
												className="rounded-full"
												aria-label={t("exercises.demo.playVideo")}
												onClick={() => setVideoLoaded(true)}
											>
												<Play aria-hidden="true" className="fill-current" />
											</Button>
										</div>
									</>
								)}
							</div>
							<div className="flex justify-end">
								<Button
									nativeButton={false}
									size="sm"
									variant="ghost"
									render={
										<a
											href={buildYouTubeWatchUrl(demo.videoId)}
											target="_blank"
											rel="noopener noreferrer"
										>
											<ExternalLink aria-hidden="true" />
											{t("exercises.demo.openYoutube")}
										</a>
									}
								/>
							</div>
						</>
					)}
				</div>
			)}

			{showSearchOnly && (
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/50 p-3">
					<div className="flex min-w-0 items-center gap-2.5">
						<IconTile variant="soft" size="sm">
							<Play aria-hidden="true" />
						</IconTile>
						<div className="flex min-w-0 flex-col gap-0.5">
							<p className="text-sm font-medium">
								{t("exercises.demo.searchYoutubeTitle")}
							</p>
							<p className="text-xs text-muted-foreground">
								{t("exercises.demo.searchYoutubeBody")}
							</p>
						</div>
					</div>
					<Button
						nativeButton={false}
						size="sm"
						variant="outline"
						render={
							<a
								href={demo.searchUrl}
								target="_blank"
								rel="noopener noreferrer"
							>
								<ExternalLink aria-hidden="true" />
								{t("exercises.demo.watchOnYoutube")}
							</a>
						}
					/>
				</div>
			)}
		</section>
	);
}
