import { describe, expect, it } from "vitest";
import { isNavItemActive, NAV_ROUTES } from "./bottom-nav-utils";

describe("bottom-nav-utils", () => {
	it("defines all 4 top-level peer tabs", () => {
		expect(NAV_ROUTES.map((item) => item.key)).toEqual([
			"train",
			"calendar",
			"exercises",
			"profile",
		]);
	});

	it("matches primary routes and nested subpaths", () => {
		expect(isNavItemActive("/today", "train")).toBe(true);
		expect(isNavItemActive("/today/", "train")).toBe(true);
		expect(isNavItemActive("/today/session-1", "train")).toBe(true);
		expect(isNavItemActive("/calendar", "calendar")).toBe(true);
		expect(isNavItemActive("/calendar/2026-11", "calendar")).toBe(true);
		expect(isNavItemActive("/exercises", "exercises")).toBe(true);
		expect(isNavItemActive("/exercises/pullup", "exercises")).toBe(true);
		expect(isNavItemActive("/profile", "profile")).toBe(true);
		expect(isNavItemActive("/profile/settings", "profile")).toBe(true);
	});

	it("matches alias routes to their parent tab", () => {
		expect(isNavItemActive("/log", "train")).toBe(true);
		expect(isNavItemActive("/plan", "train")).toBe(true);
		expect(isNavItemActive("/body", "profile")).toBe(true);
	});

	it("does not match root or similar sibling path prefixes", () => {
		expect(isNavItemActive("/", "train")).toBe(false);
		expect(isNavItemActive("/", "calendar")).toBe(false);
		expect(isNavItemActive("/calendar-extra", "calendar")).toBe(false);
		expect(isNavItemActive("/profile-setup", "profile")).toBe(false);
		expect(isNavItemActive("/today", "calendar")).toBe(false);
	});
});
