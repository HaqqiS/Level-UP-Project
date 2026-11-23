import "server-only";
import { db } from "@/lib/db";

export type DeleteAccountResult =
	| { ok: true }
	| { ok: false; error: "NOT_FOUND" | "INTERNAL_ERROR" };

/**
 * Permanently deletes a user account and cascades all relational domain records.
 */
export async function deleteUserAccountPermanently(params: {
	userId: string;
	email: string;
}): Promise<DeleteAccountResult> {
	try {
		return await db.$transaction(async (tx) => {
			const existing = await tx.user.findUnique({
				where: { id: params.userId },
				select: { id: true },
			});
			if (!existing) {
				return { ok: false as const, error: "NOT_FOUND" as const };
			}

			await tx.verification.deleteMany({
				where: { identifier: params.email },
			});

			await tx.user.delete({
				where: { id: params.userId },
			});

			return { ok: true as const };
		});
	} catch (error) {
		console.error("Failed to delete user account:", error);
		return { ok: false, error: "INTERNAL_ERROR" };
	}
}
