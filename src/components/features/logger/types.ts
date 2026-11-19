export type LoggedSetView = {
	id: string;
	exerciseId: string;
	setNumber: number;
	reps: number | null;
	seconds: number | null;
};

export type WorkoutLogView = {
	id: string;
	date: string;
	completedAt: string | null;
	sets: LoggedSetView[];
};
