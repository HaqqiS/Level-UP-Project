export const PRIMARY_AI_MODEL_ID = "gemini-3.8-flash";
export const FALLBACK_AI_MODEL_ID = "gemini-3.1-flash-lite";
export const TERTIARY_AI_MODEL_ID = "gemini-3.5-flash-lite";

export const PRIMARY_AI_TIMEOUT_MS = 30_000;
export const FALLBACK_AI_TIMEOUT_MS = 20_000;
export const TERTIARY_AI_TIMEOUT_MS = 20_000;

export type ModelAttemptConfig = {
	modelId: string;
	timeoutMs: number;
	isFallback: boolean;
};

export const AI_MODEL_CHAIN: readonly ModelAttemptConfig[] = [
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
];

export type FallbackRunResult<T> = {
	value: T;
	modelId: string;
	usedFallbackModel: boolean;
};

/**
 * Executes an async AI operation across `chain` in order (default:
 * `gemini-3.8-flash` @ 30s -> `gemini-3.1-flash-lite` @ 20s -> `gemini-3.5-flash-lite` @ 20s).
 * Calls `onAttemptError` for each failed attempt and throws the last error
 * only when every model in the chain fails.
 */
export async function runWithModelFallback<T>(params: {
	chain?: readonly ModelAttemptConfig[];
	execute: (attempt: ModelAttemptConfig) => Promise<T>;
	onAttemptError?: (attempt: ModelAttemptConfig, error: unknown) => void;
}): Promise<FallbackRunResult<T>> {
	const chain = params.chain ?? AI_MODEL_CHAIN;
	if (chain.length === 0) {
		throw new Error("AI model chain must contain at least one model.");
	}

	let lastError: unknown;
	for (const attempt of chain) {
		try {
			const value = await params.execute(attempt);
			return {
				value,
				modelId: attempt.modelId,
				usedFallbackModel: attempt.isFallback,
			};
		} catch (error) {
			lastError = error;
			params.onAttemptError?.(attempt, error);
		}
	}

	throw lastError;
}
