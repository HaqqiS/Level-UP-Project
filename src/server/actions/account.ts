"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { deleteAccountSchema } from "@/lib/validation/account";
import { deleteUserAccountPermanently } from "@/server/services/account-service";

export async function syncUserTimezoneAction(timezone: string) {
	const trimmed = timezone.trim();
	if (!trimmed || trimmed.length > 64) {
		return { ok: false as const, updated: false as const };
	}
	try {
		new Intl.DateTimeFormat("en-US", { timeZone: trimmed });
	} catch {
		return { ok: false as const, updated: false as const };
	}

	const session = await requireSession();
	const current = await db.profile.findUnique({
		where: { userId: session.user.id },
		select: { timezone: true },
	});
	if (!current || current.timezone === trimmed) {
		return { ok: true as const, updated: false as const };
	}

	await db.profile.update({
		where: { userId: session.user.id },
		data: { timezone: trimmed },
	});

	revalidatePath("/today");
	revalidatePath("/calendar");
	revalidatePath("/profile");
	return { ok: true as const, updated: true as const };
}

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
