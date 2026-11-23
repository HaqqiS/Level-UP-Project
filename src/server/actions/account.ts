"use server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireSession } from "@/lib/auth/session";
import { deleteAccountSchema } from "@/lib/validation/account";
import { deleteUserAccountPermanently } from "@/server/services/account-service";

export async function deleteAccountAction(input: { confirmation: string }) {
	const session = await requireSession();
	const parsed = deleteAccountSchema.safeParse(input);
	if (!parsed.success) {
		return { ok: false as const, error: "INVALID_CONFIRMATION" as const };
	}

	const result = await deleteUserAccountPermanently({
		userId: session.user.id,
		email: session.user.email,
	});
	if (!result.ok) {
		return result;
	}

	try {
		await auth.api.signOut({ headers: await headers() });
	} catch {
		// Session record was already cascade-deleted; ignore cookie cleanup failures.
	}

	return { ok: true as const };
}
