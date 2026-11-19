"use client";
import { CircleAlert, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/reui/alert";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth/client";

export function GoogleSignInButton() {
	const t = useTranslations();
	const params = useSearchParams();
	const [loading, setLoading] = useState(false);
	const next = params.get("next") ?? "/today";
	const error = params.get("error");

	useEffect(() => {
		if (error) toast.error(t("auth.notAllowed"));
	}, [error, t]);

	async function onClick() {
		setLoading(true);
		const res = await signIn.social({
			provider: "google",
			callbackURL: next.startsWith("/") ? next : "/today",
			errorCallbackURL: "/sign-in",
		});
		if (res?.error) {
			toast.error(t("common.error"));
			setLoading(false);
		}
	}

	return (
		<div className="flex flex-col gap-3">
			{error && (
				<Alert variant="destructive">
					<CircleAlert />
					<AlertDescription>{t("auth.notAllowed")}</AlertDescription>
				</Alert>
			)}
			<Button className="w-full" onClick={onClick} disabled={loading}>
				{loading ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
				{t("auth.google")}
			</Button>
		</div>
	);
}

function GoogleIcon() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path
				fill="#EA4335"
				d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z"
			/>
		</svg>
	);
}
