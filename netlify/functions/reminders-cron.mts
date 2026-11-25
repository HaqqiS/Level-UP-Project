import type { Config } from "@netlify/functions";

/**
 * Triggers Next.js `/api/cron/reminders` every 15 minutes (UTC) on published
 * Netlify production deploys. Both training and H-2 period reminders evaluate a
 * 60-minute local-time window and guard idempotency per user/day in PostgreSQL.
 */
export default async function handler(req: Request): Promise<void> {
	const cronSecret = (Netlify.env.get("CRON_SECRET") ?? "").trim();
	const rawBaseUrl = (
		Netlify.env.get("URL") ??
		Netlify.env.get("BETTER_AUTH_URL") ??
		""
	).trim();

	if (!cronSecret || !rawBaseUrl) {
		console.error(
			"[reminders-cron] Missing CRON_SECRET or site URL (URL / BETTER_AUTH_URL); skipping dispatch.",
		);
		return;
	}

	let nextRun: string | undefined;
	try {
		const payload = (await req.json()) as { next_run?: string };
		nextRun = payload.next_run;
	} catch {
		// Manual CLI invocation may not include a JSON body.
	}

	const endpoint = `${rawBaseUrl.replace(/\/+$/, "")}/api/cron/reminders`;
	const response = await fetch(endpoint, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${cronSecret}`,
		},
		signal: AbortSignal.timeout(25_000),
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => "");
		console.error(
			`[reminders-cron] Dispatch failed with HTTP ${response.status}: ${errorText.slice(0, 300)}`,
		);
		throw new Error(`Cron dispatch failed with status ${response.status}`);
	}

	const summary = await response.json().catch(() => null);
	console.log(
		"[reminders-cron] Dispatch succeeded",
		JSON.stringify({ nextRun, summary }),
	);
}

export const config: Config = {
	schedule: "*/15 * * * *",
};
