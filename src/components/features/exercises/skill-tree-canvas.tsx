"use client";
import { cn } from "cn";
import {
	CircleDot,
	Crown,
	Link2,
	Lock,
	Maximize2,
	Minus,
	Plus,
	Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import type {
	MasteryTierAchieved,
	ProgressionEdgeKindValue,
	SkillEdgeRequirement,
	SkillNodeStatus,
} from "@/lib/gamification/skill-tree";
import type {
	LayoutEdge,
	LayoutNode,
	SkillTreeCanvasLayout,
} from "@/lib/gamification/skill-tree-layout";
import type { ExerciseItem } from "./types";

const MIN_ZOOM = 0.55;
const MAX_ZOOM = 1.45;
const ZOOM_STEP = 0.15;
const DRAG_THRESHOLD_PX = 5;

export const TIER_BADGE_CLASS: Record<MasteryTierAchieved, string> = {
	NONE: "border-border bg-secondary text-secondary-foreground",
	BRONZE:
		"border-orange-500/35 bg-orange-500/12 text-orange-800 dark:border-orange-400/35 dark:bg-orange-500/15 dark:text-orange-300",
	SILVER:
		"border-slate-400/45 bg-slate-500/12 text-slate-700 dark:border-slate-400/35 dark:bg-slate-400/15 dark:text-slate-200",
	GOLD: "border-amber-500/45 bg-amber-500/15 text-amber-800 dark:border-amber-400/45 dark:bg-amber-400/18 dark:text-amber-300",
};

const NODE_TIER_SURFACE: Record<MasteryTierAchieved, string> = {
	NONE: "border-emerald-500/50 bg-emerald-50/85 hover:bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/55",
	BRONZE:
		"border-orange-500/55 bg-orange-50/85 hover:bg-orange-50 dark:border-orange-400/45 dark:bg-orange-950/35 dark:hover:bg-orange-950/50",
	SILVER:
		"border-slate-400/70 bg-slate-50/95 hover:bg-slate-100/90 dark:border-slate-400/45 dark:bg-slate-900/75 dark:hover:bg-slate-900",
	GOLD: "border-amber-500/65 bg-amber-50/90 hover:bg-amber-50 dark:border-amber-400/55 dark:bg-amber-950/45 dark:hover:bg-amber-950/60",
};

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function getEdgeDashArray(kind: ProgressionEdgeKindValue): string | undefined {
	switch (kind) {
		case "PREREQUISITE":
			return "5 4";
		case "ALTERNATIVE":
			return "2 3";
		case "PROGRESSION":
			return undefined;
	}
}

export function CrossPatternPortalChips({
	portals,
	exercisesById,
	onSelectExercise,
	compact = false,
	className,
}: {
	portals: readonly SkillEdgeRequirement[];
	exercisesById: ReadonlyMap<string, ExerciseItem>;
	onSelectExercise: (exercise: ExerciseItem) => void;
	compact?: boolean;
	className?: string;
}) {
	const t = useTranslations("exercises");

	if (portals.length === 0) return null;

	return (
		<div className={cn("flex flex-wrap items-center gap-1", className)}>
			{portals.map((portal) => {
				const hint = t("skillTree.crossPatternHint", {
					pattern: t(`patterns.${portal.exercisePattern}`),
					name: portal.exerciseName,
				});
				return (
					<Badge
						key={portal.edgeId}
						variant={portal.isMet ? "success-light" : "outline"}
						size="xs"
						title={hint}
						render={
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									const target = exercisesById.get(portal.exerciseId);
									if (target) onSelectExercise(target);
								}}
							/>
						}
						className={cn(
							"cursor-pointer transition-colors hover:bg-muted",
							!portal.isMet && "bg-card/95 text-muted-foreground",
							compact && "max-w-[144px] shadow-xs",
						)}
					>
						<Link2 className="shrink-0" />
						<span className="min-w-0 truncate">{hint}</span>
					</Badge>
				);
			})}
		</div>
	);
}

function CanvasNodeCard({
	node,
	isMissingEquipment,
	isDimmed,
	isFocused,
	exercisesById,
	onSelectExercise,
}: {
	node: LayoutNode<ExerciseItem>;
	isMissingEquipment: boolean;
	isDimmed: boolean;
	isFocused: boolean;
	exercisesById: ReadonlyMap<string, ExerciseItem>;
	onSelectExercise: (exercise: ExerciseItem) => void;
}) {
	const t = useTranslations("exercises");
	const {
		status,
		highestTier,
		bestSetsInSession,
		targetSets,
		progressPercent,
	} = node.mastery;

	const cardTone =
		status === "mastered"
			? NODE_TIER_SURFACE[highestTier]
			: status === "ongoing"
				? "border-primary/60 bg-card shadow-sm ring-1 ring-primary/15 hover:bg-accent/40"
				: "border-border/80 bg-muted/75 text-muted-foreground hover:bg-muted";

	return (
		<div
			style={{
				left: node.x - node.width / 2,
				top: node.y - node.height / 2,
				width: node.width,
				height: node.height,
			}}
			className={cn(
				"absolute z-10 transition-opacity duration-150",
				isDimmed && "opacity-35",
				isFocused && "z-20",
			)}
		>
			<button
				type="button"
				onClick={() => onSelectExercise(node.exercise)}
				className={cn(
					"flex h-full w-full flex-col justify-between rounded-xl border p-2 text-left transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
					cardTone,
					isFocused &&
						"ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md",
				)}
			>
				<div className="flex items-center justify-between gap-1">
					<span className="inline-flex shrink-0 items-center">
						{status === "mastered" ? (
							<Crown className="size-3.5 text-amber-600 dark:text-amber-400" />
						) : status === "ongoing" ? (
							<CircleDot className="size-3.5 text-primary" />
						) : (
							<Lock className="size-3.5 text-muted-foreground" />
						)}
					</span>

					<div className="flex min-w-0 items-center gap-1">
						{isMissingEquipment && (
							<span
								title={t("skillTree.missingEquipmentHint")}
								className="inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-warning/40 bg-warning/15 text-warning-foreground dark:text-warning"
							>
								<Wrench className="size-2.5" aria-hidden="true" />
								<span className="sr-only">
									{t("skillTree.missingEquipmentBadge")}
								</span>
							</span>
						)}
						{status === "mastered" && highestTier !== "NONE" ? (
							<span
								className={cn(
									"inline-flex h-4 items-center rounded-full border px-1.5 text-[9px] font-semibold leading-none",
									TIER_BADGE_CLASS[highestTier],
								)}
							>
								{t(`skillTree.tiers.${highestTier}`)}
							</span>
						) : status === "ongoing" ? (
							<span className="text-[10px] font-medium text-primary tabular-nums">
								{bestSetsInSession}/{targetSets}
							</span>
						) : (
							<span className="text-[10px] text-muted-foreground tabular-nums">
								{t("levelBadge", { level: node.exercise.difficulty })}
							</span>
						)}
					</div>
				</div>

				<p className="line-clamp-2 text-[11px] font-semibold leading-tight text-foreground">
					{node.exercise.name}
				</p>

				<div className="w-full">
					{status === "ongoing" ? (
						<div className="h-1 w-full overflow-hidden rounded-full bg-muted">
							<div
								className="h-full rounded-full bg-primary transition-all"
								style={{ width: `${Math.max(6, progressPercent)}%` }}
							/>
						</div>
					) : (
						<div className="flex items-center justify-between text-[9px] text-muted-foreground tabular-nums">
							<span>
								{t("levelBadge", { level: node.exercise.difficulty })}
							</span>
							<span>
								{node.mastery.measure === "SECONDS"
									? `${node.mastery.targetSets}×${node.mastery.targetValue}s`
									: `${node.mastery.targetSets}×${node.mastery.targetValue}`}
							</span>
						</div>
					)}
				</div>
			</button>

			{node.crossPatternPortals.length > 0 && (
				<CrossPatternPortalChips
					portals={node.crossPatternPortals}
					exercisesById={exercisesById}
					onSelectExercise={onSelectExercise}
					compact
					className="pointer-events-auto absolute -bottom-2.5 left-1/2 z-20 -translate-x-1/2 justify-center"
				/>
			)}
		</div>
	);
}

export function SkillTreeCanvas({
	layout,
	exercisesById,
	missingEquipmentIds,
	statusFilter,
	focusedExerciseId,
	focusNonce,
	onSelectExercise,
}: {
	layout: SkillTreeCanvasLayout<ExerciseItem>;
	exercisesById: ReadonlyMap<string, ExerciseItem>;
	missingEquipmentIds: ReadonlySet<string>;
	statusFilter: "all" | SkillNodeStatus;
	focusedExerciseId: string | null;
	focusNonce: number;
	onSelectExercise: (exercise: ExerciseItem) => void;
}) {
	const t = useTranslations("exercises");
	const viewportRef = useRef<HTMLDivElement>(null);
	const viewportSizeRef = useRef({ width: 0, height: 0 });
	const lastFittedPatternRef = useRef<string | null>(null);
	const lastHandledFocusNonceRef = useRef(0);
	const suppressClickRef = useRef(false);
	const suppressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const dragRef = useRef<{
		pointerId: number;
		startX: number;
		startY: number;
		originPanX: number;
		originPanY: number;
		moved: boolean;
	} | null>(null);

	const [zoom, setZoom] = useState(1);
	const zoomRef = useRef(1);
	zoomRef.current = zoom;
	const [pan, setPan] = useState({ x: 0, y: 0 });
	const [isDragging, setIsDragging] = useState(false);

	const nodesById = useMemo(
		() => new Map(layout.nodes.map((node) => [node.exercise.id, node])),
		[layout.nodes],
	);

	const clampPan = useCallback(
		(
			nextX: number,
			nextY: number,
			nextZoom: number,
			vw: number,
			vh: number,
		) => {
			if (vw <= 0 || vh <= 0) return { x: nextX, y: nextY };
			const margin = 80;
			const minX = margin - layout.width * nextZoom;
			const maxX = vw - margin;
			const minY = margin - layout.height * nextZoom;
			const maxY = vh - margin;
			return {
				x: clamp(nextX, Math.min(minX, maxX), Math.max(minX, maxX)),
				y: clamp(nextY, Math.min(minY, maxY), Math.max(minY, maxY)),
			};
		},
		[layout.width, layout.height],
	);

	const fitToViewport = useCallback(
		(vw: number, vh: number) => {
			if (vw <= 0 || vh <= 0 || layout.width <= 0 || layout.height <= 0) {
				return;
			}
			const fitScale = Math.min(vw / layout.width, vh / layout.height);
			const nextZoom = clamp(Math.min(1, fitScale), MIN_ZOOM, MAX_ZOOM);
			const scaledW = layout.width * nextZoom;
			const scaledH = layout.height * nextZoom;
			const nextX = (vw - scaledW) / 2;
			// Anchor Tier 1 at the bottom when taller than viewport so foundation nodes stay visible.
			const nextY = scaledH <= vh ? (vh - scaledH) / 2 : vh - scaledH;
			setZoom(nextZoom);
			setPan({ x: nextX, y: nextY });
		},
		[layout.width, layout.height],
	);

	const centerOnNode = useCallback(
		(node: LayoutNode<ExerciseItem>, vw: number, vh: number) => {
			if (vw <= 0 || vh <= 0) return;
			const nextZoom = clamp(
				Math.max(zoomRef.current, 0.95),
				MIN_ZOOM,
				MAX_ZOOM,
			);
			const nextX = vw / 2 - node.x * nextZoom;
			const nextY = vh / 2 - node.y * nextZoom;
			setZoom(nextZoom);
			setPan(clampPan(nextX, nextY, nextZoom, vw, vh));
		},
		[clampPan],
	);

	useLayoutEffect(() => {
		const el = viewportRef.current;
		if (!el) return;

		const syncViewport = () => {
			const vw = el.clientWidth;
			const vh = el.clientHeight;
			if (vw <= 0 || vh <= 0) return;
			viewportSizeRef.current = { width: vw, height: vh };

			const focusedNode = focusedExerciseId
				? nodesById.get(focusedExerciseId)
				: undefined;
			if (focusedNode && focusNonce > lastHandledFocusNonceRef.current) {
				lastHandledFocusNonceRef.current = focusNonce;
				lastFittedPatternRef.current = layout.pattern;
				centerOnNode(focusedNode, vw, vh);
				return;
			}

			if (lastFittedPatternRef.current !== layout.pattern) {
				lastFittedPatternRef.current = layout.pattern;
				fitToViewport(vw, vh);
			}
		};

		syncViewport();

		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(() => syncViewport());
		observer.observe(el);
		return () => observer.disconnect();
	}, [
		centerOnNode,
		fitToViewport,
		focusNonce,
		focusedExerciseId,
		layout.pattern,
		nodesById,
	]);

	useEffect(() => {
		return () => {
			if (suppressTimerRef.current) {
				clearTimeout(suppressTimerRef.current);
			}
		};
	}, []);

	const applyZoomStep = (delta: number) => {
		const { width: vw, height: vh } = viewportSizeRef.current;
		const nextZoom = clamp(
			Number((zoom + delta).toFixed(2)),
			MIN_ZOOM,
			MAX_ZOOM,
		);
		if (nextZoom === zoom) return;
		if (vw <= 0 || vh <= 0) {
			setZoom(nextZoom);
			return;
		}
		const cx = vw / 2;
		const cy = vh / 2;
		const worldX = (cx - pan.x) / zoom;
		const worldY = (cy - pan.y) / zoom;
		const nextPan = clampPan(
			cx - worldX * nextZoom,
			cy - worldY * nextZoom,
			nextZoom,
			vw,
			vh,
		);
		setZoom(nextZoom);
		setPan(nextPan);
	};

	const handleFitClick = () => {
		const el = viewportRef.current;
		const vw = el?.clientWidth ?? viewportSizeRef.current.width;
		const vh = el?.clientHeight ?? viewportSizeRef.current.height;
		fitToViewport(vw, vh);
	};

	const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if (e.button !== 0) return;
		const target = e.target as HTMLElement;
		if (target.closest("[data-canvas-control]")) return;

		dragRef.current = {
			pointerId: e.pointerId,
			startX: e.clientX,
			startY: e.clientY,
			originPanX: pan.x,
			originPanY: pan.y,
			moved: false,
		};
	};

	const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current;
		if (!drag || drag.pointerId !== e.pointerId) return;

		const dx = e.clientX - drag.startX;
		const dy = e.clientY - drag.startY;
		if (!drag.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
			drag.moved = true;
			setIsDragging(true);
			try {
				viewportRef.current?.setPointerCapture(e.pointerId);
			} catch {
				// Pointer capture can throw if pointer is already inactive.
			}
		}

		if (drag.moved) {
			const { width: vw, height: vh } = viewportSizeRef.current;
			setPan(
				clampPan(drag.originPanX + dx, drag.originPanY + dy, zoom, vw, vh),
			);
		}
	};

	const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current;
		if (!drag || drag.pointerId !== e.pointerId) return;

		if (drag.moved) {
			suppressClickRef.current = true;
			if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
			suppressTimerRef.current = setTimeout(() => {
				suppressClickRef.current = false;
			}, 80);
			try {
				if (viewportRef.current?.hasPointerCapture(e.pointerId)) {
					viewportRef.current.releasePointerCapture(e.pointerId);
				}
			} catch {
				// Ignore release errors when capture is already lost.
			}
		}

		dragRef.current = null;
		setIsDragging(false);
	};

	const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!suppressClickRef.current) return;
		suppressClickRef.current = false;
		e.stopPropagation();
		e.preventDefault();
	};

	return (
		<div
			ref={viewportRef}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={endDrag}
			onPointerCancel={endDrag}
			onClickCapture={handleClickCapture}
			className={cn(
				"relative h-[min(62dvh,540px)] min-h-[400px] w-full overflow-hidden rounded-2xl border border-border bg-background/80 select-none touch-none",
				isDragging ? "cursor-grabbing" : "cursor-grab",
			)}
			style={{
				backgroundImage:
					"radial-gradient(circle, color-mix(in oklch, var(--foreground) 14%, transparent) 1.25px, transparent 1.25px)",
				backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
				backgroundPosition: `${pan.x}px ${pan.y}px`,
			}}
		>
			<div
				style={{
					width: layout.width,
					height: layout.height,
					transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
					transformOrigin: "0 0",
				}}
				className={cn(
					"relative will-change-transform",
					!isDragging && "transition-transform duration-200 ease-out",
				)}
			>
				{layout.nodesByTier.map((group) => {
					const sampleNode = group.nodes[0];
					if (!sampleNode) return null;
					return (
						<span
							key={`tier-marker-${group.tier}`}
							style={{ top: sampleNode.y - 9, left: 8 }}
							className="pointer-events-none absolute text-[10px] font-semibold text-muted-foreground/65 tabular-nums"
						>
							T{group.tier}
						</span>
					);
				})}

				<svg
					width={layout.width}
					height={layout.height}
					viewBox={`0 0 ${layout.width} ${layout.height}`}
					className="pointer-events-none absolute inset-0 z-0"
					aria-hidden="true"
				>
					{layout.edges.map((edge: LayoutEdge) => {
						const fromNode = nodesById.get(edge.fromId);
						const toNode = nodesById.get(edge.toId);
						const matchesFilter =
							statusFilter === "all" ||
							fromNode?.mastery.status === statusFilter ||
							toNode?.mastery.status === statusFilter;
						const touchesFocus =
							focusedExerciseId !== null &&
							(edge.fromId === focusedExerciseId ||
								edge.toId === focusedExerciseId);

						return (
							<path
								key={edge.id}
								d={edge.pathD}
								fill="none"
								strokeDasharray={getEdgeDashArray(edge.kind)}
								strokeWidth={(edge.isMet ? 2 : 1.5) + (touchesFocus ? 0.75 : 0)}
								strokeLinecap="round"
								className={cn(
									"transition-opacity duration-150",
									edge.isMet ? "stroke-success" : "stroke-muted-foreground",
									!matchesFilter
										? "opacity-20"
										: touchesFocus
											? "opacity-100"
											: edge.isMet
												? "opacity-85"
												: "opacity-45",
								)}
							>
								{edge.branchLabel ? <title>{edge.branchLabel}</title> : null}
							</path>
						);
					})}
				</svg>

				{layout.nodes.map((node) => {
					const isDimmed =
						statusFilter !== "all" && node.mastery.status !== statusFilter;
					return (
						<CanvasNodeCard
							key={node.exercise.id}
							node={node}
							isMissingEquipment={missingEquipmentIds.has(node.exercise.id)}
							isDimmed={isDimmed}
							isFocused={focusedExerciseId === node.exercise.id}
							exercisesById={exercisesById}
							onSelectExercise={onSelectExercise}
						/>
					);
				})}
			</div>

			<div
				data-canvas-control="true"
				className="absolute right-3 bottom-3 z-30 flex items-center gap-1 rounded-full border border-border bg-background/90 p-1 shadow-sm backdrop-blur-sm"
			>
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					aria-label={t("skillTree.zoomOutAria")}
					disabled={zoom <= MIN_ZOOM}
					onClick={() => applyZoomStep(-ZOOM_STEP)}
				>
					<Minus />
				</Button>
				<span className="min-w-10 text-center text-[11px] font-medium text-muted-foreground tabular-nums">
					{Math.round(zoom * 100)}%
				</span>
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					aria-label={t("skillTree.zoomInAria")}
					disabled={zoom >= MAX_ZOOM}
					onClick={() => applyZoomStep(ZOOM_STEP)}
				>
					<Plus />
				</Button>
				<Button
					type="button"
					variant="outline"
					size="xs"
					onClick={handleFitClick}
				>
					<Maximize2 />
					{t("skillTree.fitViewButton")}
				</Button>
			</div>
		</div>
	);
}
