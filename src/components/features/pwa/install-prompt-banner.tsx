"use client";
import { Download, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { IconTile } from "@/components/reui/icon-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPromptBanner() {
	const t = useTranslations("pwa");
	const [promptEvent, setPromptEvent] =
		useState<BeforeInstallPromptEvent | null>(null);
	const [dismissed, setDismissed] = useState(false);

	useEffect(() => {
		const isStandalone = window.matchMedia(
			"(display-mode: standalone)",
		).matches;
		if (isStandalone) return;

		const handler = (event: Event) => {
			event.preventDefault();
			setPromptEvent(event as BeforeInstallPromptEvent);
		};

		window.addEventListener("beforeinstallprompt", handler);
		return () => window.removeEventListener("beforeinstallprompt", handler);
	}, []);

	if (!promptEvent || dismissed) return null;

	async function handleInstall() {
		if (!promptEvent) return;
		await promptEvent.prompt();
		const choice = await promptEvent.userChoice;
		if (choice.outcome === "accepted") {
			setPromptEvent(null);
		}
	}

	return (
		<Card size="sm">
			<CardContent className="flex items-center gap-3">
				<IconTile variant="soft" size="sm">
					<Smartphone />
				</IconTile>
				<div className="space-y-1">
					<p className="text-sm font-semibold">{t("installTitle")}</p>
					<p className="text-sm text-muted-foreground">
						{t("installDescription")}
					</p>
				</div>
			</CardContent>
			<CardFooter className="flex-row gap-2">
				<Button size="sm" className="flex-1" onClick={handleInstall}>
					<Download />
					{t("installButton")}
				</Button>
				<Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
					{t("dismiss")}
				</Button>
			</CardFooter>
		</Card>
	);
}
