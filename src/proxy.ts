import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

const PROTECTED = [
	"/today",
	"/calendar",
	"/exercises",
	"/plan",
	"/log",
	"/body",
	"/profile",
	"/onboarding",
];

/**
 * Optimistic check only (no DB). Real auth is enforced server-side.
 *
 * IMPORTANT: Do NOT redirect `/sign-in` -> `/today` here based on cookie presence.
 * If the browser holds a stale/expired/revoked session cookie, `/today` will
 * fail `auth.api.getSession()` and redirect back to `/sign-in`, causing an
 * infinite redirect loop. Valid-session redirects from `/sign-in` are handled
 * server-side in `src/app/(auth)/sign-in/page.tsx` via `getSession()`.
 */
export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const hasSession = Boolean(getSessionCookie(request));

	if (!hasSession && PROTECTED.some((p) => pathname.startsWith(p))) {
		const url = new URL("/sign-in", request.url);
		url.searchParams.set("next", pathname);
		return NextResponse.redirect(url);
	}
	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
