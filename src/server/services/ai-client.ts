import "server-only";
import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import type { z } from "zod";
import {
	AI_MODEL_CHAIN,
	type ModelAttemptConfig,
	runWithModelFallback,
} from "@/lib/ai/model-config";
import "@/lib/env";

function formatAiError(error: unknown): string {
	if (error instanceof Error) {
		const statusCode =
			"statusCode" in error && typeof error.statusCode === "number"
				? ` (HTTP ${error.statusCode})`
				: "";
		return `${error.name}${statusCode}: ${error.message}`;
	}
	return String(error);
}

export async function generateStructuredWithFallback<
	TSchema extends z.ZodType,
>(params: {
	schema: TSchema;
	prompt: string;
	label: string;
	chain?: readonly ModelAttemptConfig[];
}): Promise<{
	object: z.output<TSchema>;
	modelId: string;
	usedFallbackModel: boolean;
	tokens: number;
}> {
	const { schema, prompt, label, chain = AI_MODEL_CHAIN } = params;

	const result = await runWithModelFallback({
		chain,
		execute: async (attempt) => {
			const response = await generateText({
				model: google(attempt.modelId),
				output: Output.object({ schema }),
				prompt,
				maxRetries: 1,
				abortSignal: AbortSignal.timeout(attempt.timeoutMs),
			});
			return {
				object: response.output as z.output<TSchema>,
				tokens: response.usage?.totalTokens ?? 0,
			};
		},
		onAttemptError: (attempt, error) => {
			const isLast = attempt.modelId === chain[chain.length - 1]?.modelId;
			const msg = `[ai:${label}] model=${attempt.modelId} failed (timeout=${attempt.timeoutMs}ms): ${formatAiError(error)}`;
			if (isLast) {
				console.error(msg);
			} else {
				console.warn(`${msg} — trying fallback model`);
			}
		},
	});

	return {
		object: result.value.object,
		modelId: result.modelId,
		usedFallbackModel: result.usedFallbackModel,
		tokens: result.value.tokens,
	};
}

export async function generateGroundedSearchWithFallback(params: {
	prompt: string;
	label: string;
	chain?: readonly ModelAttemptConfig[];
}): Promise<{
	text: string;
	firstGroundUrl?: string;
	modelId: string;
	tokens: number;
}> {
	const { prompt, label, chain = AI_MODEL_CHAIN } = params;

	const result = await runWithModelFallback({
		chain,
		execute: async (attempt) => {
			const response = await generateText({
				model: google(attempt.modelId),
				tools: {
					google_search: google.tools.googleSearch({}),
				},
				prompt,
				maxRetries: 0,
				abortSignal: AbortSignal.timeout(attempt.timeoutMs),
			});

			const firstSource = response.sources?.[0];
			const firstGroundUrl =
				firstSource &&
				"url" in firstSource &&
				typeof firstSource.url === "string"
					? firstSource.url
					: undefined;

			return {
				text: response.text,
				firstGroundUrl,
				tokens: response.usage?.totalTokens ?? 0,
			};
		},
		onAttemptError: (attempt, error) => {
			const msg = `[ai:${label}:search] model=${attempt.modelId} failed (timeout=${attempt.timeoutMs}ms): ${formatAiError(error)}`;
			if (attempt.isFallback) {
				console.error(msg);
			} else {
				console.warn(`${msg} — trying fallback model`);
			}
		},
	});

	return {
		text: result.value.text,
		firstGroundUrl: result.value.firstGroundUrl,
		modelId: result.modelId,
		tokens: result.value.tokens,
	};
}
