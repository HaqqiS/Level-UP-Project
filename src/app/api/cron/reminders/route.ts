import { NextResponse } from "next/server";
import {
	dispatchDuePeriodReminders,
	dispatchDueTrainingReminders,
} from "@/server/services/push-reminder-service";

function isAuthorized(request: Request): boolean {
	const secret = (process.env.CRON_SECRET ?? "").trim();
	if (!secret) return false;
	const header = request.headers.get("authorization") ?? "";
	return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
	if (!isAuthorized(request)) {
		return NextResponse.json(
			{ ok: false, error: "Unauthorized" },
			{ status: 401 },
		);
	}

	const [training, period] = await Promise.all([
		dispatchDueTrainingReminders(),
		dispatchDuePeriodReminders(),
	]);

	return NextResponse.json({
		ok: training.ok && period.ok,
		training,
		period,
	});
}

export async function POST(request: Request) {
	return GET(request);
}
