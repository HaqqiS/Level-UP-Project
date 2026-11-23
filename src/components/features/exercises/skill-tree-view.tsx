"use client";
import {
	Activity,
	ArrowDownUp,
	Award,
	CircleDot,
	Crown,
	Flame,
	Footprints,
	GitBranch,
	Layers,
	Lock,
	Search,
	ShieldAlert,
	Sparkles,
	X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Badge } from "@/components/reui/badge";
import { Frame, FramePanel } from "@/components/reui/frame";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
} from "@/components/ui/empty";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@/components/ui/input-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { MovementPattern } from "@/lib/exercises/eligibility";
import type {
	SkillNodeStatus,
	SkillTreeEvaluation,
} from "@/lib/gamification/skill-tree";
import { computeBottomUpDagLayout } from "@/lib/gamification/skill-tree-layout";
import { SkillTreeCanvas, TIER_BADGE_CLASS } from "./skill-tree-canvas";
import { SkillTreeTierList } from "./skill-tree-tier-list";
import type { ExerciseItem } from "./types";

const TREE_PATTERNS: readonly MovementPattern[] = [
	"PULL",
	"PUSH",
	"LEGS",
	"CORE",
	"SKILL",
	"MOBILITY",
];

const PATTERN_ICON: Record<MovementPattern, typeof Flame> = {
	PULL: ArrowDownUp,
	PUSH: Flame,
	LEGS: Footprints,
	CORE: ShieldAlert,
	SKILL: Sparkles,
	MOBILITY: Activity,
};

type ViewMode = "canvas" | "tiers";
type StatusFilter = "all" | SkillNodeStatus;

function SmallStatusIcon({ status }: { status: SkillNodeStatus }) {
	switch (status) {
		case "mastered":
			return (
				<Crown className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
			);
		case "ongoing":
			return <CircleDot className="size-3.5 shrink-0 text-primary" />;
		case "locked":
			return <Lock className="size-3.5 shrink-0 text-muted-foreground" />;
	}
}

export function SkillTreeView({
	exercises,
	skillTree,
	userEquipment,
	onSelectExercise,
}: {
	exercises: readonly ExerciseItem[];
	skillTree: SkillTreeEvaluation<ExerciseItem>;
	userEquipment: readonly string[];
	onSelectExercise: (exercise: ExerciseItem) => void;
}) {
	const t = useTranslations("exercises");
	const [activePattern, setActivePattern] = useState<MovementPattern>("PULL");
	const [viewMode, setViewMode] = useState<ViewMode>("canvas");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [focusedExerciseId, setFocusedExerciseId] = useState<string | null>(
		null,
	);
	const [focusNonce, setFocusNonce] = useState(0);

	const exercisesById = useMemo(
		() => new Map(exercises.map((ex) => [ex.id, ex])),
		[exercises],
	);

	const missingEquipmentIds = useMemo(() => {
		const equipmentSet = new Set(userEquipment);
		const missing = new Set<string>();
		for (const ex of exercises) {
			if (
				!ex.equipment.includes("none") &&
				ex.equipment.some((eq) => !equipmentSet.has(eq))
			) {
				missing.add(ex.id);
			}
		}
		return missing;
	}, [exercises, userEquipment]);

	const patternCounts = useMemo(() => {
		const counts = new Map<
			MovementPattern,
			{ mastered: number; total: number }
		>();
		for (const pattern of TREE_PATTERNS) {
			counts.set(pattern, { mastered: 0, total: 0 });
		}
		for (const ex of exercises) {
			const entry = counts.get(ex.pattern);
			if (!entry) continue;
			entry.total += 1;
			if (skillTree.masteryByExerciseId[ex.id]?.status === "mastered") {
				entry.mastered += 1;
			}
		}
		return counts;
	}, [exercises, skillTree.masteryByExerciseId]);

	const searchMatches = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return [];
		return exercises
			.filter((ex) => ex.name.toLowerCase().includes(q))
			.sort((a, b) => {
				const aActive = a.pattern === activePattern ? 0 : 1;
				const bActive = b.pattern === activePattern ? 0 : 1;
				if (aActive !== bActive) return aActive - bActive;
				return a.difficulty - b.difficulty || a.name.localeCompare(b.name);
			})
			.slice(0, 8);
	}, [exercises, searchQuery, activePattern]);

	const layout = useMemo(
		() =>
			computeBottomUpDagLayout({
				pattern: activePattern,
				exercises,
				edges: skillTree.edges,
				masteryByExerciseId: skillTree.masteryByExerciseId,
			}),
		[activePattern, exercises, skillTree.edges, skillTree.masteryByExerciseId],
	);

	const handleJumpToNode = (exercise: ExerciseItem) => {
		if (exercise.pattern !== activePattern) {
			setActivePattern(exercise.pattern);
		}
		setFocusedExerciseId(exercise.id);
		setFocusNonce((n) => n + 1);
		setSearchQuery("");
	};

	const tierCounts = [
		{ tier: "BRONZE" as const, count: skillTree.counts.bronze },
		{ tier: "SILVER" as const, count: skillTree.counts.silver },
		{ tier: "GOLD" as const, count: skillTree.counts.gold },
	].filter((item) => item.count > 0);

	const edgeLegendItems = [
		{
			key: "progression",
			strokeWidth: 2,
			dashArray: undefined,
			label: t("skillTree.legendProgression"),
		},
		{
			key: "prerequisite",
			strokeWidth: 1.5,
			dashArray: "5 4",
			label: t("skillTree.legendPrerequisite"),
		},
		{
			key: "alternative",
			strokeWidth: 1.5,
			dashArray: "2 3",
			label: t("skillTree.legendAlternative"),
		},
	];

	return (
		<div className="flex flex-col gap-3">
			<Tabs
				value={activePattern}
				onValueChange={(value) => {
					setActivePattern(String(value) as MovementPattern);
					setFocusedExerciseId(null);
				}}
			>
				<div className="relative">
					<div className="w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
						<TabsList className="inline-flex h-auto w-max items-center gap-1 rounded-2xl bg-muted/75 p-1 pr-6">
							{TREE_PATTERNS.map((pattern) => {
								const counts = patternCounts.get(pattern) ?? {
									mastered: 0,
									total: 0,
								};
								const PatternIcon = PATTERN_ICON[pattern];
								return (
									<TabsTrigger
										key={pattern}
										value={pattern}
										aria-label={t("skillTree.patternTab", {
											pattern: t(`patterns.${pattern}`),
										})}
										className="flex-none shrink-0 gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all data-active:bg-background data-active:text-foreground data-active:shadow-sm"
									>
										<PatternIcon className="size-3.5" aria-hidden="true" />
										<span>{t(`patterns.${pattern}`)}</span>
										<Badge
											variant={
												activePattern === pattern
													? "primary-light"
													: "secondary"
											}
											size="xs"
											className="tabular-nums"
										>
											{t("skillTree.patternProgress", counts)}
										</Badge>
									</TabsTrigger>
								);
							})}
						</TabsList>
					</div>
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-y-0 right-0 w-6 rounded-r-2xl bg-gradient-to-l from-background/90 to-transparent"
					/>
				</div>

				<div className="mt-3 flex flex-col gap-2">
					<div className="flex items-center gap-2">
						<InputGroup className="flex-1">
							<InputGroupAddon>
								<Search />
							</InputGroupAddon>
							<InputGroupInput
								id="skill-tree-search"
								name="skillTreeSearch"
								aria-label={t("skillTree.searchNodePlaceholder")}
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder={t("skillTree.searchNodePlaceholder")}
							/>
							{searchQuery.length > 0 && (
								<InputGroupAddon align="inline-end">
									<InputGroupButton
										size="icon-xs"
										onClick={() => setSearchQuery("")}
										aria-label={t("skillTree.searchNodePlaceholder")}
									>
										<X />
									</InputGroupButton>
								</InputGroupAddon>
							)}
						</InputGroup>

						<ToggleGroup
							variant="outline"
							size="sm"
							spacing={0}
							value={[viewMode]}
							onValueChange={(values) => {
								const next = values[0];
								if (next === "canvas" || next === "tiers") {
									setViewMode(next);
								}
							}}
						>
							<ToggleGroupItem value="canvas">
								<GitBranch />
								{t("skillTree.canvasView")}
							</ToggleGroupItem>
							<ToggleGroupItem value="tiers">
								<Layers />
								{t("skillTree.tierListView")}
							</ToggleGroupItem>
						</ToggleGroup>
					</div>

					{searchQuery.trim().length > 0 && (
						<Frame spacing="xs">
							<FramePanel className="space-y-1.5">
								{searchMatches.length > 0 ? (
									<div className="flex flex-col gap-1">
										{searchMatches.map((match) => {
											const status =
												skillTree.masteryByExerciseId[match.id]?.status ??
												"locked";
											return (
												<button
													key={match.id}
													type="button"
													onClick={() => handleJumpToNode(match)}
													className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
												>
													<span className="flex min-w-0 items-center gap-2">
														<SmallStatusIcon status={status} />
														<span className="truncate font-medium">
															{match.name}
														</span>
													</span>
													<span className="flex shrink-0 items-center gap-1">
														<Badge variant="secondary" size="xs">
															{t(`patterns.${match.pattern}`)}
														</Badge>
														<Badge variant="outline" size="xs">
															{t("levelBadge", { level: match.difficulty })}
														</Badge>
													</span>
												</button>
											);
										})}
									</div>
								) : (
									<p className="py-1 text-center text-xs text-muted-foreground">
										{t("skillTree.noSearchResults")}
									</p>
								)}
							</FramePanel>
						</Frame>
					)}

					<ToggleGroup
						variant="outline"
						size="sm"
						spacing={1}
						className="w-full flex-wrap"
						value={[statusFilter]}
						onValueChange={(values) => {
							const next = values[0];
							if (
								next === "all" ||
								next === "ongoing" ||
								next === "mastered" ||
								next === "locked"
							) {
								setStatusFilter(next);
							}
						}}
					>
						<ToggleGroupItem value="all" className="px-2.5 text-xs">
							{t("skillTree.filterAll")}
						</ToggleGroupItem>
						<ToggleGroupItem value="ongoing" className="px-2.5 text-xs">
							<CircleDot />
							{t("skillTree.status.ongoing")}
						</ToggleGroupItem>
						<ToggleGroupItem value="mastered" className="px-2.5 text-xs">
							<Crown />
							{t("skillTree.status.mastered")}
						</ToggleGroupItem>
						<ToggleGroupItem value="locked" className="px-2.5 text-xs">
							<Lock />
							{t("skillTree.status.locked")}
						</ToggleGroupItem>
					</ToggleGroup>
				</div>

				<TabsContent value={activePattern} className="mt-3">
					{layout.nodes.length === 0 ? (
						<Frame>
							<Empty>
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<GitBranch />
									</EmptyMedia>
									<EmptyDescription>
										{t("skillTree.emptyPattern")}
									</EmptyDescription>
								</EmptyHeader>
							</Empty>
						</Frame>
					) : viewMode === "canvas" ? (
						<SkillTreeCanvas
							layout={layout}
							exercisesById={exercisesById}
							missingEquipmentIds={missingEquipmentIds}
							statusFilter={statusFilter}
							focusedExerciseId={focusedExerciseId}
							focusNonce={focusNonce}
							onSelectExercise={onSelectExercise}
						/>
					) : (
						<SkillTreeTierList
							layout={layout}
							exercisesById={exercisesById}
							missingEquipmentIds={missingEquipmentIds}
							statusFilter={statusFilter}
							focusedExerciseId={focusedExerciseId}
							focusNonce={focusNonce}
							onSelectExercise={onSelectExercise}
						/>
					)}
				</TabsContent>
			</Tabs>

			<Frame spacing="sm">
				<FramePanel className="space-y-2.5 text-xs">
					<div className="flex flex-wrap items-center gap-1.5">
						<Badge variant="primary-light" size="sm">
							<CircleDot />
							{t("skillTree.status.ongoing")} ({skillTree.counts.ongoing})
						</Badge>
						<Badge variant="secondary" size="sm">
							<Lock />
							{t("skillTree.status.locked")} ({skillTree.counts.locked})
						</Badge>
						<Badge variant="success-light" size="sm">
							<Crown />
							{t("skillTree.status.mastered")} ({skillTree.counts.mastered})
						</Badge>
						{tierCounts.map(({ tier, count }) => (
							<Badge
								key={tier}
								variant="outline"
								size="sm"
								className={TIER_BADGE_CLASS[tier]}
							>
								<Award />
								{t(`skillTree.tiers.${tier}`)} ({count})
							</Badge>
						))}
					</div>

					<div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
						{edgeLegendItems.map((item) => (
							<span key={item.key} className="inline-flex items-center gap-1.5">
								<svg width="22" height="8" aria-hidden="true">
									<line
										x1="0"
										y1="4"
										x2="22"
										y2="4"
										stroke="currentColor"
										strokeWidth={item.strokeWidth}
										strokeDasharray={item.dashArray}
									/>
								</svg>
								{item.label}
							</span>
						))}
					</div>
				</FramePanel>
			</Frame>
		</div>
	);
}
