import { describe, expect, it } from "vitest";
import {
	DELETE_ACCOUNT_KEYWORD,
	deleteAccountSchema,
	isDeleteConfirmationValid,
} from "./account";

describe("account validation", () => {
	it("accepts exact DELETE confirmation keyword", () => {
		expect(isDeleteConfirmationValid(DELETE_ACCOUNT_KEYWORD)).toBe(true);
		expect(isDeleteConfirmationValid("  DELETE  ")).toBe(true);
		expect(
			deleteAccountSchema.safeParse({ confirmation: "DELETE" }).success,
		).toBe(true);
		expect(
			deleteAccountSchema.safeParse({ confirmation: "  DELETE " }).success,
		).toBe(true);
	});

	it("rejects mismatched, lowercase, partial, or empty inputs", () => {
		for (const invalid of ["", "   ", "delete", "DEL", "DELETEE", "confirm"]) {
			expect(isDeleteConfirmationValid(invalid)).toBe(false);
			expect(
				deleteAccountSchema.safeParse({ confirmation: invalid }).success,
			).toBe(false);
		}
	});
});
