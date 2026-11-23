export type NavItemKey = "train" | "calendar" | "exercises" | "profile";

export type NavRouteItem = {
	key: NavItemKey;
	href: string;
	matchPrefixes: readonly string[];
};

export const NAV_ROUTES: readonly NavRouteItem[] = [
	{
		key: "train",
		href: "/today",
		matchPrefixes: ["/today", "/log", "/plan"],
	},
	{
		key: "calendar",
		href: "/calendar",
		matchPrefixes: ["/calendar"],
	},
	{
		key: "exercises",
		href: "/exercises",
		matchPrefixes: ["/exercises"],
	},
	{
		key: "profile",
		href: "/profile",
		matchPrefixes: ["/profile", "/body"],
	},
] as const;

function normalizePath(path: string): string {
	const withoutQuery = path.split(/[?#]/)[0] ?? "/";
	if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
		return withoutQuery.slice(0, -1);
	}
	return withoutQuery;
}

export function isNavItemActive(pathname: string, key: NavItemKey): boolean {
	const route = NAV_ROUTES.find((item) => item.key === key);
	if (!route) return false;

	const normalized = normalizePath(pathname);
	return route.matchPrefixes.some(
		(prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
	);
}
