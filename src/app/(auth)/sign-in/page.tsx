import { Dumbbell } from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { GoogleSignInButton } from "@/components/features/auth/google-sign-in-button";
import { Badge } from "@/components/reui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function SignInPage() {
	const t = useTranslations();
	return (
		<main className="flex min-h-dvh items-center justify-center p-4">
			<Card className="w-full max-w-sm">
				<CardHeader className="justify-items-center text-center">
					<Badge variant="primary-light" size="xl" radius="full">
						<Dumbbell />
						{t("common.appName")}
					</Badge>
					<CardTitle>{t("auth.title")}</CardTitle>
					<CardDescription>{t("auth.subtitle")}</CardDescription>
				</CardHeader>
				<CardContent>
					<Suspense>
						<GoogleSignInButton />
					</Suspense>
				</CardContent>
				<CardFooter className="justify-center text-center text-xs text-muted-foreground">
					{t("auth.disclaimerNote")}
				</CardFooter>
			</Card>
		</main>
	);
}
