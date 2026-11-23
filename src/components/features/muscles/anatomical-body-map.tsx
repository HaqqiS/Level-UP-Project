"use client";
import {
	type KeyboardEvent,
	type PointerEvent,
	useId,
	useRef,
	useState,
} from "react";
import type { MuscleIntensity } from "@/lib/exercises/muscle-heatmap";
import type { MuscleGroup } from "@/lib/exercises/muscles";
import {
	type BodyMapGender,
	type BodyViewModel,
	getBodyMapModel,
} from "./body-map-paths";

export const MUSCLE_LEGEND_SWATCH_CLASS: Record<MuscleIntensity, string> = {
	primary: "bg-primary dark:bg-[oklch(0.84_0.095_68)]",
	secondary: "bg-primary/45 dark:bg-[oklch(0.58_0.075_64)]",
	untargeted:
		"border border-border/70 bg-stone-200/90 dark:border-stone-600/70 dark:bg-[oklch(0.35_0.014_60)]",
};

function fillClassForIntensity(intensity: MuscleIntensity): string {
	switch (intensity) {
		case "primary":
			return "fill-primary dark:fill-[oklch(0.84_0.095_68)]";
		case "secondary":
			return "fill-primary/45 dark:fill-[oklch(0.58_0.075_64)]";
		case "untargeted":
			return "fill-stone-200/90 dark:fill-[oklch(0.35_0.014_60)]";
	}
}

const DEFAULT_INTENSITY_LABELS: Record<MuscleIntensity, string> = {
	primary: "Primary",
	secondary: "Secondary",
	untargeted: "Untargeted",
};

function BodySideSvg({
	view,
	side,
	label,
	idPrefix,
	intensityByMuscle,
	selectedMuscle,
	hoveredMuscle,
	interactive,
	onSelectMuscle,
	onMusclePointerEnter,
	onMusclePointerMove,
	onMusclePointerLeave,
	onMuscleFocus,
	onMuscleBlur,
	muscleLabel,
}: {
	view: BodyViewModel;
	side: "front" | "back";
	label: string;
	idPrefix: string;
	intensityByMuscle: Record<MuscleGroup, MuscleIntensity>;
	selectedMuscle: MuscleGroup | null;
	hoveredMuscle: MuscleGroup | null;
	interactive: boolean;
	onSelectMuscle?: (muscle: MuscleGroup) => void;
	onMusclePointerEnter: (
		event: PointerEvent<SVGGElement>,
		muscle: MuscleGroup,
	) => void;
	onMusclePointerMove: (
		event: PointerEvent<SVGGElement>,
		muscle: MuscleGroup,
	) => void;
	onMusclePointerLeave: (muscle: MuscleGroup) => void;
	onMuscleFocus: (el: SVGGElement, muscle: MuscleGroup) => void;
	onMuscleBlur: (muscle: MuscleGroup) => void;
	muscleLabel?: (muscle: MuscleGroup) => string;
}) {
	const clipIdFor = (clipId: string) => `${idPrefix}-${side}-${clipId}`;

	const normalRegions = view.muscleRegions.filter(
		(r) => r.muscle !== selectedMuscle && r.muscle !== hoveredMuscle,
	);
	const hoveredRegions =
		hoveredMuscle && hoveredMuscle !== selectedMuscle
			? view.muscleRegions.filter((r) => r.muscle === hoveredMuscle)
			: [];
	const selectedRegions = selectedMuscle
		? view.muscleRegions.filter((r) => r.muscle === selectedMuscle)
		: [];

	function handleKeyDown(
		event: KeyboardEvent<SVGGElement>,
		muscle: MuscleGroup,
	) {
		if (!onSelectMuscle) return;
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			onSelectMuscle(muscle);
		}
	}

	function renderRegion(region: BodyViewModel["muscleRegions"][number]) {
		const intensity = intensityByMuscle[region.muscle] ?? "untargeted";
		const isSelected = selectedMuscle === region.muscle;
		const isHovered = hoveredMuscle === region.muscle;
		const fillClass = fillClassForIntensity(intensity);
		const clipAttr = region.clipId
			? `url(#${clipIdFor(region.clipId)})`
			: undefined;
		const accessibleLabel = muscleLabel
			? muscleLabel(region.muscle)
			: region.muscle.replaceAll("_", " ");

		const strokeClass = isSelected
			? `${fillClass} stroke-foreground dark:stroke-white`
			: isHovered
				? `${fillClass} stroke-foreground/90 dark:stroke-white/95`
				: `${fillClass} stroke-card`;
		const strokeWidth = isSelected ? 2.2 : isHovered ? 1.85 : 1.15;

		if (!interactive) {
			return (
				<g
					key={region.id}
					clipPath={clipAttr}
					className="cursor-default transition-[filter] duration-150 hover:brightness-95 dark:hover:brightness-115"
					onPointerEnter={(e) => onMusclePointerEnter(e, region.muscle)}
					onPointerMove={(e) => onMusclePointerMove(e, region.muscle)}
					onPointerLeave={() => onMusclePointerLeave(region.muscle)}
				>
					{region.paths.map((d) => (
						<path
							key={`${region.id}-${d.slice(0, 24)}-${d.length}`}
							d={d}
							className={strokeClass}
							strokeWidth={strokeWidth}
							vectorEffect="non-scaling-stroke"
							strokeLinejoin="round"
							strokeLinecap="round"
						/>
					))}
				</g>
			);
		}

		return (
			// biome-ignore lint/a11y/useSemanticElements: SVG groups map anatomical vector paths to tappable muscle triggers
			<g
				key={region.id}
				clipPath={clipAttr}
				role="button"
				tabIndex={0}
				aria-label={accessibleLabel}
				aria-pressed={isSelected}
				className="cursor-pointer outline-none transition-[filter] duration-150 hover:brightness-95 focus-visible:brightness-95 dark:hover:brightness-115 dark:focus-visible:brightness-115"
				onClick={() => onSelectMuscle?.(region.muscle)}
				onKeyDown={(e) => handleKeyDown(e, region.muscle)}
				onPointerEnter={(e) => onMusclePointerEnter(e, region.muscle)}
				onPointerMove={(e) => onMusclePointerMove(e, region.muscle)}
				onPointerLeave={() => onMusclePointerLeave(region.muscle)}
				onFocus={(e) => onMuscleFocus(e.currentTarget, region.muscle)}
				onBlur={() => onMuscleBlur(region.muscle)}
			>
				{region.paths.map((d) => (
					<path
						key={`${region.id}-${d.slice(0, 24)}-${d.length}`}
						d={d}
						className={strokeClass}
						strokeWidth={strokeWidth}
						vectorEffect="non-scaling-stroke"
						strokeLinejoin="round"
						strokeLinecap="round"
					/>
				))}
			</g>
		);
	}

	return (
		<figure className="flex flex-col items-center gap-1">
			<svg
				viewBox={view.viewBox}
				className="h-auto w-full overflow-visible"
				role="img"
				aria-label={label}
			>
				{view.clipRegions.length > 0 && (
					<defs>
						{view.clipRegions.map((clip) => (
							<clipPath key={clip.id} id={clipIdFor(clip.id)}>
								{clip.shape.kind === "rect" ? (
									<rect
										x={clip.shape.x}
										y={clip.shape.y}
										width={clip.shape.width}
										height={clip.shape.height}
									/>
								) : (
									<polygon points={clip.shape.points} />
								)}
							</clipPath>
						))}
					</defs>
				)}

				{view.silhouettePaths.map((d) => (
					<path
						key={`sil-${d.slice(0, 28)}-${d.length}`}
						d={d}
						className="fill-muted/90 stroke-card dark:fill-[oklch(0.265_0.006_60)]"
						strokeWidth="1"
						vectorEffect="non-scaling-stroke"
						strokeLinejoin="round"
						strokeLinecap="round"
					/>
				))}

				{normalRegions.map(renderRegion)}

				{view.outlinePaths.map((d) => (
					<path
						key={`outline-${d.slice(0, 24)}-${d.length}`}
						d={d}
						className="pointer-events-none fill-none stroke-border/80 dark:stroke-stone-500/45"
						strokeWidth="1.2"
						vectorEffect="non-scaling-stroke"
						strokeLinejoin="round"
						strokeLinecap="round"
					/>
				))}

				{hoveredRegions.map(renderRegion)}
				{selectedRegions.map(renderRegion)}
			</svg>
			<figcaption className="text-[11px] font-medium text-muted-foreground">
				{label}
			</figcaption>
		</figure>
	);
}

export function AnatomicalBodyMap({
	intensityByMuscle,
	selectedMuscle = null,
	onSelectMuscle,
	gender = "male",
	compact = false,
	frontLabel = "Front",
	backLabel = "Back",
	muscleLabel,
	intensityLabels = DEFAULT_INTENSITY_LABELS,
}: {
	intensityByMuscle: Record<MuscleGroup, MuscleIntensity>;
	selectedMuscle?: MuscleGroup | null;
	onSelectMuscle?: (muscle: MuscleGroup) => void;
	gender?: BodyMapGender;
	compact?: boolean;
	frontLabel?: string;
	backLabel?: string;
	muscleLabel?: (muscle: MuscleGroup) => string;
	intensityLabels?: Record<MuscleIntensity, string>;
}) {
	const idPrefix = useId().replace(/:/g, "");
	const containerRef = useRef<HTMLDivElement>(null);
	const [hoveredMuscle, setHoveredMuscle] = useState<MuscleGroup | null>(null);
	const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
		null,
	);

	const model = getBodyMapModel(gender);
	const interactive = Boolean(onSelectMuscle);

	function updateTooltipFromClientPoint(clientX: number, clientY: number) {
		const rect = containerRef.current?.getBoundingClientRect();
		if (!rect) return;
		const rawX = clientX - rect.left;
		const rawY = clientY - rect.top;
		const minX = Math.min(64, rect.width / 2);
		const maxX = Math.max(minX, rect.width - 64);
		setTooltipPos({
			x: Math.min(maxX, Math.max(minX, rawX)),
			y: Math.max(24, rawY),
		});
	}

	function handleMusclePointerEnter(
		event: PointerEvent<SVGGElement>,
		muscle: MuscleGroup,
	) {
		if (event.pointerType === "touch") return;
		setHoveredMuscle(muscle);
		updateTooltipFromClientPoint(event.clientX, event.clientY);
	}

	function handleMusclePointerMove(
		event: PointerEvent<SVGGElement>,
		muscle: MuscleGroup,
	) {
		if (event.pointerType === "touch") return;
		if (hoveredMuscle !== muscle) setHoveredMuscle(muscle);
		updateTooltipFromClientPoint(event.clientX, event.clientY);
	}

	function handleMusclePointerLeave(muscle: MuscleGroup) {
		setHoveredMuscle((prev) => (prev === muscle ? null : prev));
		setTooltipPos(null);
	}

	function handleMuscleFocus(el: SVGGElement, muscle: MuscleGroup) {
		const elRect = el.getBoundingClientRect();
		setHoveredMuscle(muscle);
		updateTooltipFromClientPoint(elRect.left + elRect.width / 2, elRect.top);
	}

	function handleMuscleBlur(muscle: MuscleGroup) {
		setHoveredMuscle((prev) => (prev === muscle ? null : prev));
		setTooltipPos(null);
	}

	const hoveredIntensity: MuscleIntensity = hoveredMuscle
		? (intensityByMuscle[hoveredMuscle] ?? "untargeted")
		: "untargeted";
	const hoveredLabel = hoveredMuscle
		? muscleLabel
			? muscleLabel(hoveredMuscle)
			: hoveredMuscle.replaceAll("_", " ")
		: null;

	return (
		<div
			ref={containerRef}
			onPointerLeave={() => {
				setHoveredMuscle(null);
				setTooltipPos(null);
			}}
			className={
				compact
					? "relative mx-auto grid w-full max-w-[280px] grid-cols-2 items-end gap-2"
					: "relative mx-auto grid w-full max-w-sm grid-cols-2 items-end gap-3"
			}
		>
			<BodySideSvg
				view={model.front}
				side="front"
				label={frontLabel}
				idPrefix={idPrefix}
				intensityByMuscle={intensityByMuscle}
				selectedMuscle={selectedMuscle}
				hoveredMuscle={hoveredMuscle}
				interactive={interactive}
				onSelectMuscle={onSelectMuscle}
				onMusclePointerEnter={handleMusclePointerEnter}
				onMusclePointerMove={handleMusclePointerMove}
				onMusclePointerLeave={handleMusclePointerLeave}
				onMuscleFocus={handleMuscleFocus}
				onMuscleBlur={handleMuscleBlur}
				muscleLabel={muscleLabel}
			/>
			<BodySideSvg
				view={model.back}
				side="back"
				label={backLabel}
				idPrefix={idPrefix}
				intensityByMuscle={intensityByMuscle}
				selectedMuscle={selectedMuscle}
				hoveredMuscle={hoveredMuscle}
				interactive={interactive}
				onSelectMuscle={onSelectMuscle}
				onMusclePointerEnter={handleMusclePointerEnter}
				onMusclePointerMove={handleMusclePointerMove}
				onMusclePointerLeave={handleMusclePointerLeave}
				onMuscleFocus={handleMuscleFocus}
				onMuscleBlur={handleMuscleBlur}
				muscleLabel={muscleLabel}
			/>

			{hoveredMuscle && hoveredLabel && tooltipPos && (
				<div
					role="tooltip"
					style={{ left: tooltipPos.x, top: tooltipPos.y }}
					className="pointer-events-none absolute z-30 flex -translate-x-1/2 -translate-y-[calc(100%+10px)] items-center gap-1.5 whitespace-nowrap rounded-full border border-border/80 bg-popover/95 px-2.5 py-1 text-xs font-medium text-popover-foreground shadow-md backdrop-blur-md"
				>
					<span
						className={`size-2 shrink-0 rounded-full ${MUSCLE_LEGEND_SWATCH_CLASS[hoveredIntensity]}`}
					/>
					<span>{hoveredLabel}</span>
					<span className="text-[11px] font-normal text-muted-foreground">
						· {intensityLabels[hoveredIntensity]}
					</span>
				</div>
			)}
		</div>
	);
}
