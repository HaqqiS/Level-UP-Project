import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = vi.hoisted(() => ({
	profile: {
		findUnique: vi.fn(),
	},
	exercise: {
		findUnique: vi.fn(),
	},
	plannedSession: {
		findUnique: vi.fn(),
	},
	workoutLog: {
		upsert: vi.fn(),
		findUnique: vi.fn(),
		update: vi.fn(),
	},
	setLog: {
		upsert: vi.fn(),
		count: vi.fn(),
		findUnique: vi.fn(),
	},
	quest: {
		findUnique: vi.fn(),
		update: vi.fn(),
	},
	xpEvent: {
		aggregate: vi.fn(),
		upsert: vi.fn(),
	},
	$transaction: vi.fn(),
}));

const mockGamification = vi.hoisted(() => ({
	ensureTodayQuestsAndStats: vi.fn(),
	recalculateAndSaveUserStats: vi.fn(),
	syncDirectMasteryXpForUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/server/services/gamification-service", () => mockGamification);
vi.mock("@/server/services/weekly-plan-service", () => ({
	getLocalDateKey: vi.fn(() => "2026-11-19"),
}));

import { logExerciseSet, syncOfflineWorkoutBatch } from "./workout-log-service";

const validProfile = {
	userId: "user-1",
	timezone: "Asia/Jakarta",
	onboardingCompletedAt: new Date("2026-11-01T00:00:00.000Z"),
	disclaimerAcceptedAt: new Date("2026-11-01T00:00:00.000Z"),
};

describe("workout-log-service fixes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDb.profile.findUnique.mockResolvedValue(validProfile);
		mockDb.$transaction.mockImplementation(async (arg: unknown) => {
			if (typeof arg === "function") {
				return (arg as (tx: typeof mockDb) => Promise<unknown>)(mockDb);
			}
			return Promise.all(arg as Promise<unknown>[]);
		});
	});

	it("reports accurate mid-workout xpEarned when logExerciseSet triggers mastery/badge/weekly XP without finalizing", async () => {
		mockDb.exercise.findUnique.mockResolvedValue({ id: "ex-1" });
		mockDb.plannedSession.findUnique.mockResolvedValue({
			id: "ps-1",
			weeklyPlan: { userId: "user-1" },
			exercises: [{ sets: 6 }],
		});
		mockDb.workoutLog.upsert.mockResolvedValue({
			id: "wl-1",
			completedAt: null,
		});
		mockDb.setLog.upsert.mockResolvedValue({});
		mockDb.setLog.count.mockResolvedValue(3); // < 6 planned sets -> does not finalize
		mockDb.xpEvent.aggregate.mockResolvedValue({ _sum: { amount: 400 } });
		mockGamification.ensureTodayQuestsAndStats.mockResolvedValue({
			stats: { totalXp: 550 },
		});

		const res = await logExerciseSet({
			userId: "user-1",
			input: {
				plannedSessionId: "ps-1",
				exerciseId: "ex-1",
				setNumber: 3,
				reps: 10,
			},
		});

		expect(res).toEqual({
			ok: true,
			workoutLogId: "wl-1",
			sessionCompleted: false,
			xpEarned: 150,
		});
	});

	it("finalizes multi-day offline workout batches in ascending chronological date order", async () => {
		const finalizedDates: string[] = [];

		mockDb.workoutLog.findUnique.mockImplementation(
			async (args: {
				where: { id?: string; userId_date?: { date: string } };
			}) => {
				if (args.where.userId_date) {
					const date = args.where.userId_date.date;
					return {
						id: `wl-${date}`,
						userId: "user-1",
						date,
						completedAt: null,
						sets: [{ id: `s-${date}` }],
						plannedSession: null,
					};
				}
				const id = args.where.id ?? "";
				const date = id.replace("wl-", "");
				finalizedDates.push(date);
				return {
					id,
					userId: "user-1",
					date,
					startedAt: new Date("2026-11-18T10:00:00.000Z"),
					completedAt: null,
					sets: [{ id: `s-${date}` }],
					plannedSession: null,
				};
			},
		);
		mockDb.workoutLog.update.mockResolvedValue({});
		mockDb.quest.findUnique.mockResolvedValue(null);
		mockDb.xpEvent.upsert.mockResolvedValue({});
		mockDb.xpEvent.aggregate.mockResolvedValue({ _sum: { amount: 100 } });
		mockGamification.syncDirectMasteryXpForUser.mockResolvedValue({});
		mockGamification.recalculateAndSaveUserStats.mockResolvedValue({
			currentStreak: 2,
		});
		mockGamification.ensureTodayQuestsAndStats.mockResolvedValue({
			stats: { totalXp: 240 },
		});

		const res = await syncOfflineWorkoutBatch({
			userId: "user-1",
			batch: {
				sets: [],
				finishedDateKeys: ["2026-11-20", "2026-11-16", "2026-11-18"],
			},
		});

		expect(res.ok).toBe(true);
		expect(finalizedDates).toEqual(["2026-11-16", "2026-11-18", "2026-11-20"]);
	});
});
