import { describe, expect, it, vi } from "vitest";
import {
	AI_MODEL_CHAIN,
	FALLBACK_AI_MODEL_ID,
	FALLBACK_AI_TIMEOUT_MS,
	PRIMARY_AI_MODEL_ID,
	PRIMARY_AI_TIMEOUT_MS,
	runWithModelFallback,
} from "./model-config";

describe("AI_MODEL_CHAIN", () => {
	it("configures gemini-3.5-flash-lite (25s) -> gemini-3.1-flash-lite (25s)", () => {
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
		]);
		expect(PRIMARY_AI_MODEL_ID).toBe("gemini-3.5-flash-lite");
		expect(PRIMARY_AI_TIMEOUT_MS).toBe(25_000);
		expect(FALLBACK_AI_MODEL_ID).toBe("gemini-3.1-flash-lite");
		expect(FALLBACK_AI_TIMEOUT_MS).toBe(25_000);
	});
});

describe("runWithModelFallback", () => {
	it("returns primary result when primary succeeds without calling fallback", async () => {
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
			.mockResolvedValueOnce({ focus: "Fallback Push" });
		const onAttemptError = vi.fn();

		const result = await runWithModelFallback({ execute, onAttemptError });

		expect(result).toEqual({
			value: { focus: "Fallback Push" },
			modelId: FALLBACK_AI_MODEL_ID,
			usedFallbackModel: true,
		});
		expect(execute).toHaveBeenCalledTimes(2);
		expect(onAttemptError).toHaveBeenCalledTimes(1);
		expect(onAttemptError).toHaveBeenCalledWith(AI_MODEL_CHAIN[0], timeoutErr);
	});

	it("rethrows the final error when every model in the chain fails", async () => {
		const err1 = new Error("Primary failed");
		const err2 = new Error("Fallback failed");
		const execute = vi
			.fn()
			.mockRejectedValueOnce(err1)
			.mockRejectedValueOnce(err2);
		const onAttemptError = vi.fn();

		await expect(
			runWithModelFallback({ execute, onAttemptError }),
		).rejects.toThrow("Fallback failed");
		expect(onAttemptError).toHaveBeenCalledTimes(2);
	});
});
