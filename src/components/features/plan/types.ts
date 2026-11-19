import type { ExerciseItem } from "@/components/features/exercises/types";

export type PlannedExerciseView = {
	id: string;
	order: number;
	sets: number;
	targetReps: number | null;
	targetSeconds: number | null;
	restSeconds: number;
	exercise: ExerciseItem;
};

export type DailyCheckinView = {
	id: string;
	energy: number;
	soreness: number;
	painAreas: string[];
	minutesAvailable: number;
	aiNote: string | null;
	fallbackUsed: boolean;
};

export type PlannedSessionView = {
	id: string;
	dayOfWeek: number;
	focus: string;
	notes: string | null;
	isRest: boolean;
	isAdjusted: boolean;
	exercises: PlannedExerciseView[];
	dailyCheckin: DailyCheckinView | null;
};

export type WeeklyPlanViewData = {
	id: string;
	notes: string | null;
	fallbackUsed: boolean;
	sessions: PlannedSessionView[];
};
