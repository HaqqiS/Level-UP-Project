import { describe, expect, it } from "vitest";
import { isEmailAllowed, parseAllowlist } from "./allowlist";

describe("allowlist", () => {
	it("allows everyone when empty", () => {
		expect(isEmailAllowed("a@b.com", parseAllowlist(""))).toBe(true);
		expect(isEmailAllowed("a@b.com", parseAllowlist(undefined))).toBe(true);
	});
	it("matches case-insensitively and trims", () => {
		const list = parseAllowlist(" Me@Gmail.com , mom@gmail.com ");
		expect(isEmailAllowed("me@gmail.com", list)).toBe(true);
		expect(isEmailAllowed("MOM@gmail.com", list)).toBe(true);
	});
	it("rejects non-listed emails", () => {
		expect(
			isEmailAllowed("stranger@gmail.com", parseAllowlist("me@gmail.com")),
		).toBe(false);
	});
});
