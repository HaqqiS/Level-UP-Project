"use client";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Frame } from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	type EligibilityProfile,
	isExerciseEligible,
	MOVEMENT_PATTERNS,
	type MovementPattern,
} from "@/lib/exercises/eligibility";
import { DiscoverExercisesButton } from "./discover-exercises-button";
import { ExerciseCard } from "./exercise-card";
import { ExerciseDetailSheet } from "./exercise-detail-sheet";
import type { ExerciseItem } from "./types";

type PatternTab = "ALL" | MovementPattern;
const PATTERN_TABS: readonly PatternTab[] = ["ALL", ...MOVEMENT_PATTERNS];

export function ExerciseBrowser({
	exercises,
	profile,
}: {
	exercises: ExerciseItem[];
	profile: EligibilityProfile;
}) {
	const t = useTranslations("exercises");
	const [tab, setTab] = useState<PatternTab>("ALL");
	const [scope, setScope] = useState<"eligible" | "all">("eligible");
	const [query, setQuery] = useState("");
	const [selected, setSelected] = useState<ExerciseItem | null>(null);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return exercises.filter((ex) => {
			if (tab !== "ALL" && ex.pattern !== tab) return false;
			if (scope === "eligible" && !isExerciseEligible(ex, profile))
				return false;
			if (q && !ex.name.toLowerCase().includes(q)) return false;
			return true;
		});
	}, [exercises, tab, scope, query, profile]);

	const activePattern: MovementPattern = tab === "ALL" ? "PUSH" : tab;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-2">
				<InputGroup className="flex-1">
					<InputGroupAddon>
						<Search />
					</InputGroupAddon>
					<InputGroupInput
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder={t("searchPlaceholder")}
					/>
				</InputGroup>

				<ToggleGroup
					variant="outline"
					size="sm"
					value={[scope]}
					onValueChange={(values) => {
						const next = values[0];
						if (next === "eligible" || next === "all") setScope(next);
					}}
				>
					<ToggleGroupItem value="eligible">
						{t("filterEligible")}
					</ToggleGroupItem>
					<ToggleGroupItem value="all">{t("filterAll")}</ToggleGroupItem>
				</ToggleGroup>
			</div>

			<Tabs value={tab} onValueChange={(value) => setTab(value as PatternTab)}>
				<TabsList className="w-full justify-start overflow-x-auto">
					{PATTERN_TABS.map((p) => (
						<TabsTrigger key={p} value={p}>
							{t(`patterns.${p}`)}
						</TabsTrigger>
					))}
				</TabsList>

				<TabsContent value={tab} className="mt-3 space-y-4">
					{filtered.length > 0 ? (
						<Frame spacing="sm">
							{filtered.map((exercise) => (
								<ExerciseCard
									key={exercise.id}
									exercise={exercise}
									onSelect={setSelected}
								/>
							))}
						</Frame>
					) : (
						<Frame>
							<Empty>
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<Search />
									</EmptyMedia>
									<EmptyTitle>{t("emptyTitle")}</EmptyTitle>
									<EmptyDescription>{t("emptyDescription")}</EmptyDescription>
								</EmptyHeader>
								{scope === "eligible" && (
									<EmptyContent>
										<Button variant="outline" onClick={() => setScope("all")}>
											{t("filterAll")}
										</Button>
									</EmptyContent>
								)}
							</Empty>
						</Frame>
					)}

					<DiscoverExercisesButton
						pattern={activePattern}
						experienceLevel={profile.experienceLevel}
					/>
				</TabsContent>
			</Tabs>

			<ExerciseDetailSheet
				exercise={selected}
				allExercises={exercises}
				onOpenChange={(open) => {
					if (!open) setSelected(null);
				}}
				onSelectExercise={setSelected}
			/>
		</div>
	);
}
