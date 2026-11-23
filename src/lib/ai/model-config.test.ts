import { describe, expect, it, vi } from "vitest";
import {
	AI_MODEL_CHAIN,
	FALLBACK_AI_MODEL_ID,
	FALLBACK_AI_TIMEOUT_MS,
	PRIMARY_AI_MODEL_ID,
	PRIMARY_AI_TIMEOUT_MS,
	runWithModelFallback,
	TERTIARY_AI_MODEL_ID,
	TERTIARY_AI_TIMEOUT_MS,
} from "./model-config";

describe("AI_MODEL_CHAIN", () => {
	it("configures gemini-3.8-flash (30s) -> gemini-3.1-flash-lite (20s) -> gemini-3.5-flash-lite (20s)", () => {
		expect(AI_MODEL_CHAIN).toEqual([
			{
				modelId: PRIMARY_AI_MODEL_ID,
				timeoutMs: PRIMARY_AI_TIMEOUT_MS,
				isFallback: false,
			},
			{
				modelId: FALLBACK_AI_MODEL_ID,
				timeoutMs: FALLBACK_AI_TIMEOUT_MS,
				isFallback: true,
			},
			{
				modelId: TERTIARY_AI_MODEL_ID,
				timeoutMs: TERTIARY_AI_TIMEOUT_MS,
				isFallback: true,
			},
		]);
		expect(PRIMARY_AI_MODEL_ID).toBe("gemini-3.8-flash");
		expect(PRIMARY_AI_TIMEOUT_MS).toBe(30_000);
		expect(FALLBACK_AI_MODEL_ID).toBe("gemini-3.1-flash-lite");
		expect(FALLBACK_AI_TIMEOUT_MS).toBe(20_000);
		expect(TERTIARY_AI_MODEL_ID).toBe("gemini-3.5-flash-lite");
		expect(TERTIARY_AI_TIMEOUT_MS).toBe(20_000);
	});
});

describe("runWithModelFallback", () => {
	it("returns primary result when primary succeeds without calling fallbacks", async () => {
		const execute = vi.fn().mockResolvedValueOnce({ focus: "Push" });
		const onAttemptError = vi.fn();

		const result = await runWithModelFallback({ execute, onAttemptError });

		expect(result).toEqual({
			value: { focus: "Push" },
			modelId: PRIMARY_AI_MODEL_ID,
			usedFallbackModel: false,
		});
		expect(execute).toHaveBeenCalledTimes(1);
		expect(onAttemptError).not.toHaveBeenCalled();
	});

	it("falls back to gemini-3.1-flash-lite when primary fails or times out", async () => {
		const timeoutErr = new Error("Timeout");
		const execute = vi
			.fn()
			.mockRejectedValueOnce(timeoutErr)
			.mockResolvedValueOnce({ focus: "Recovery Push" });
		const onAttemptError = vi.fn();

		const result = await runWithModelFallback({ execute, onAttemptError });

		expect(result).toEqual({
			value: { focus: "Recovery Push" },
			modelId: FALLBACK_AI_MODEL_ID,
			usedFallbackModel: true,
		});
		expect(execute).toHaveBeenCalledTimes(2);
		expect(onAttemptError).toHaveBeenCalledTimes(1);
		expect(onAttemptError).toHaveBeenCalledWith(AI_MODEL_CHAIN[0], timeoutErr);
	});

	it("falls back to gemini-3.5-flash-lite when both primary and secondary fail", async () => {
		const err1 = new Error("503 Primary");
		const err2 = new Error("Timeout Secondary");
		const execute = vi
			.fn()
			.mockRejectedValueOnce(err1)
			.mockRejectedValueOnce(err2)
			.mockResolvedValueOnce({ focus: "Tertiary Push" });
		const onAttemptError = vi.fn();

		const result = await runWithModelFallback({ execute, onAttemptError });

		expect(result).toEqual({
			value: { focus: "Tertiary Push" },
			modelId: TERTIARY_AI_MODEL_ID,
			usedFallbackModel: true,
		});
		expect(execute).toHaveBeenCalledTimes(3);
		expect(onAttemptError).toHaveBeenCalledTimes(2);
	});

	it("rethrows the final error when every model in the chain fails", async () => {
		const err1 = new Error("Primary failed");
		const err2 = new Error("Secondary failed");
		const err3 = new Error("Tertiary failed");
		const execute = vi
			.fn()
			.mockRejectedValueOnce(err1)
			.mockRejectedValueOnce(err2)
			.mockRejectedValueOnce(err3);
		const onAttemptError = vi.fn();

		await expect(
			runWithModelFallback({ execute, onAttemptError }),
		).rejects.toThrow("Tertiary failed");
		expect(onAttemptError).toHaveBeenCalledTimes(3);
	});
});
