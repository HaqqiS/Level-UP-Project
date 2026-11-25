import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = vi.hoisted(() => ({
	profile: {
		findUnique: vi.fn(),
	},
	userWellnessItem: {
		findMany: vi.fn(),
	},
	dailyWellnessLog: {
		findUnique: vi.fn(),
		upsert: vi.fn(),
	},
	$transaction: vi.fn(),
}));

const mockGamification = vi.hoisted(() => ({
	ensureTodayQuestsAndStats: vi.fn(),
	syncHydrationQuestForDate: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/server/services/gamification-service", () => mockGamification);
vi.mock("@/server/services/weekly-plan-service", () => ({
	getLocalDateKey: vi.fn(() => "2026-11-19"),
}));

import {
	getDailyHydrationMlForUser,
	getTodayHydrationMlForUser,
	saveDailyWellnessLogForUser,
} from "./wellness-service";

describe("wellness-service hydration sync & helpers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDb.$transaction.mockImplementation(async (arg: unknown) => {
			if (typeof arg === "function") {
				return (arg as (tx: typeof mockDb) => Promise<unknown>)(mockDb);
			}
			return Promise.all(arg as Promise<unknown>[]);
		});
		mockDb.profile.findUnique.mockResolvedValue({
			timezone: "Asia/Jakarta",
			tracksPeriod: false,
			averageCycleDays: 28,
			averagePeriodDays: 5,
		});
		mockDb.userWellnessItem.findMany.mockResolvedValue([]);
		mockDb.dailyWellnessLog.findUnique.mockResolvedValue(null);
		mockDb.dailyWellnessLog.upsert.mockImplementation(
			async (args: { create: Record<string, unknown> }) => args.create,
		);
		mockGamification.ensureTodayQuestsAndStats.mockResolvedValue({});
	});

	it("calls ensureTodayQuestsAndStats directly once when today hydration >= 2000 ml (handles rollover without double sync)", async () => {
		const res = await saveDailyWellnessLogForUser("user-1", {
			date: "2026-11-19",
			painTags: [],
			medications: [],
			supplements: [],
			moodTags: [],
			hydrationMl: 2000,
		});

		expect(res.ok).toBe(true);
		expect(mockGamification.ensureTodayQuestsAndStats).toHaveBeenCalledTimes(1);
		expect(mockGamification.ensureTodayQuestsAndStats).toHaveBeenCalledWith(
			"user-1",
		);
		expect(mockGamification.syncHydrationQuestForDate).not.toHaveBeenCalled();
	});

	it("skips ensureTodayQuestsAndStats when hydration < 2000 ml or log date is not today", async () => {
		await saveDailyWellnessLogForUser("user-1", {
			date: "2026-11-19",
			painTags: [],
			medications: [],
			supplements: [],
			moodTags: [],
			hydrationMl: 1750,
		});
		await saveDailyWellnessLogForUser("user-1", {
			date: "2026-11-18",
			painTags: [],
			medications: [],
			supplements: [],
			moodTags: [],
			hydrationMl: 2500,
		});

		expect(mockGamification.ensureTodayQuestsAndStats).not.toHaveBeenCalled();
	});

	it("returns daily and today hydration ml via exported helpers", async () => {
		mockDb.dailyWellnessLog.findUnique.mockResolvedValue({ hydrationMl: 1250 });

		await expect(
			getDailyHydrationMlForUser("user-1", "2026-11-19"),
		).resolves.toBe(1250);
		await expect(
			getTodayHydrationMlForUser("user-1", "Asia/Jakarta"),
		).resolves.toBe(1250);
	});
});
