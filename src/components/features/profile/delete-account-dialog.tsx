"use client";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/reui/alert";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signOut } from "@/lib/auth/client";
import { clearAllOfflineData } from "@/lib/offline/db";
import {
	DELETE_ACCOUNT_KEYWORD,
	isDeleteConfirmationValid,
} from "@/lib/validation/account";
import { deleteAccountAction } from "@/server/actions/account";

export function DeleteAccountDialog({
	open,
	onOpenChange,
	userEmail,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	userEmail: string;
}) {
	const t = useTranslations();
	const [confirmation, setConfirmation] = useState("");
	const [pending, startTransition] = useTransition();

	const canConfirm = isDeleteConfirmationValid(confirmation) && !pending;

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) {
			if (pending) return;
			setConfirmation("");
		}
		onOpenChange(nextOpen);
	}

	function handleConfirmDelete() {
		if (!canConfirm) return;
		startTransition(async () => {
			try {
				if (typeof window !== "undefined" && "serviceWorker" in navigator) {
					const registration = await navigator.serviceWorker.getRegistration();
					const subscription =
						await registration?.pushManager.getSubscription();
					await subscription?.unsubscribe();
				}
			} catch {
				// Ignore browser push unsubscribe failures; DB deletion cascades subscriptions.
			}

			const res = await deleteAccountAction({ confirmation });
			if (!res.ok) {
				toast.error(t("common.error"));
				return;
			}

			await clearAllOfflineData().catch(() => {});
			await signOut().catch(() => {});
			toast.success(t("profile.deleteAccount.deletedToast"));
			window.location.assign("/sign-in");
		});
	}

	return (
		<AlertDialog open={open} onOpenChange={handleOpenChange}>
			<AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2 text-destructive">
						<AlertTriangle className="size-4 shrink-0" />
						<span>{t("profile.deleteAccount.dialogTitle")}</span>
					</AlertDialogTitle>
					<AlertDialogDescription>
						{t("profile.deleteAccount.dialogDescription", {
							email: userEmail,
						})}
					</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="space-y-3">
					<Alert variant="destructive">
						<AlertDescription className="space-y-1.5 text-xs">
							<p className="font-medium text-foreground">
								{t("profile.deleteAccount.dataListTitle")}
							</p>
							<ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
								<li>{t("profile.deleteAccount.dataProfile")}</li>
								<li>{t("profile.deleteAccount.dataWorkouts")}</li>
								<li>{t("profile.deleteAccount.dataPlans")}</li>
								<li>{t("profile.deleteAccount.dataWellness")}</li>
								<li>{t("profile.deleteAccount.dataAccount")}</li>
							</ul>
						</AlertDescription>
					</Alert>

					<Field>
						<FieldLabel htmlFor="delete-account-confirm-input">
							{t("profile.deleteAccount.confirmLabel", {
								keyword: DELETE_ACCOUNT_KEYWORD,
							})}
						</FieldLabel>
						<Input
							id="delete-account-confirm-input"
							value={confirmation}
							onChange={(e) => setConfirmation(e.target.value)}
							placeholder={t("profile.deleteAccount.confirmPlaceholder")}
							disabled={pending}
							autoComplete="off"
							autoCorrect="off"
							autoCapitalize="characters"
							spellCheck={false}
						/>
					</Field>
				</div>

				<AlertDialogFooter>
					<AlertDialogCancel disabled={pending}>
						{t("profile.deleteAccount.cancelButton")}
					</AlertDialogCancel>
					<Button
						type="button"
						variant="destructive"
						disabled={!canConfirm}
						onClick={handleConfirmDelete}
					>
						{pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
						{pending
							? t("profile.deleteAccount.deletingButton")
							: t("profile.deleteAccount.confirmButton")}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
