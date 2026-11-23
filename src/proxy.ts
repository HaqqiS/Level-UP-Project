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

/** Optimistic check only (no DB). Real auth is enforced server-side. */
export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const hasSession = Boolean(getSessionCookie(request));

	if (!hasSession && PROTECTED.some((p) => pathname.startsWith(p))) {
		const url = new URL("/sign-in", request.url);
		url.searchParams.set("next", pathname);
		return NextResponse.redirect(url);
	}
	if (hasSession && pathname === "/sign-in") {
		return NextResponse.redirect(new URL("/today", request.url));
	}
	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
