import { z } from "zod";

export const DELETE_ACCOUNT_KEYWORD = "DELETE";

export const deleteAccountSchema = z.object({
	confirmation: z
		.string()
		.trim()
		.refine((value) => value === DELETE_ACCOUNT_KEYWORD, {
			message: "Confirmation keyword must match DELETE.",
		}),
});

export function isDeleteConfirmationValid(value: string): boolean {
	return value.trim() === DELETE_ACCOUNT_KEYWORD;
}
