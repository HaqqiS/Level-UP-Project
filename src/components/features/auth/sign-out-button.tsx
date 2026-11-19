"use client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/client";

export function SignOutButton() {
	const t = useTranslations("common");
	const router = useRouter();
	return (
		<Button
			variant="outline"
			className="w-full"
			onClick={async () => {
				await signOut();
				router.replace("/sign-in");
				router.refresh();
			}}
		>
			<LogOut />
			{t("signOut")}
		</Button>
	);
}
