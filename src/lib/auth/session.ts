import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "./index";

export const getSession = cache(async () => {
	return auth.api.getSession({ headers: await headers() });
});

export async function requireSession() {
	const session = await getSession();
	if (!session) redirect("/sign-in");
	return session;
}

export const getProfile = cache(async (userId: string) => {
	return db.profile.findUnique({ where: { userId } });
});

/** Requires a session AND completed onboarding + disclaimer. */
export async function requireOnboarded() {
	const session = await requireSession();
	const profile = await getProfile(session.user.id);
	if (!profile?.onboardingCompletedAt || !profile.disclaimerAcceptedAt) {
		redirect("/onboarding");
	}
	return { session, profile };
}
