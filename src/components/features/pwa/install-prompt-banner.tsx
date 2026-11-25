"use client";
import { Download, Share, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { IconTile } from "@/components/reui/icon-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIosSafariBrowser(): boolean {
	const ua = window.navigator.userAgent;
	const isIosDevice =
		/iphone|ipad|ipod/i.test(ua) ||
		(window.navigator.platform === "MacIntel" &&
			window.navigator.maxTouchPoints > 1);
	return isIosDevice && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
}

export function InstallPromptBanner() {
	const t = useTranslations("pwa");
	const [promptEvent, setPromptEvent] =
		useState<BeforeInstallPromptEvent | null>(null);
	const [showIosGuide, setShowIosGuide] = useState(false);
	const [dismissed, setDismissed] = useState(false);

	useEffect(() => {
		const isStandalone =
			window.matchMedia("(display-mode: standalone)").matches ||
			Boolean(
				(window.navigator as Navigator & { standalone?: boolean }).standalone,
			);
		if (isStandalone) return;

		if (isIosSafariBrowser()) {
			setShowIosGuide(true);
			return;
		}

		const handler = (event: Event) => {
			event.preventDefault();
			setPromptEvent(event as BeforeInstallPromptEvent);
		};

		window.addEventListener("beforeinstallprompt", handler);
		return () => window.removeEventListener("beforeinstallprompt", handler);
	}, []);

	if ((!promptEvent && !showIosGuide) || dismissed) return null;

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
			<CardContent className="flex items-start gap-3">
				<IconTile variant="soft" size="sm">
					<Smartphone aria-hidden="true" />
				</IconTile>
				<div className="flex flex-col gap-0.5">
					<p className="text-sm font-semibold">{t("installTitle")}</p>
					<p className="text-sm text-muted-foreground">
						{t("installDescription")}
					</p>
					{showIosGuide && (
						<p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
							<Share className="size-3.5 shrink-0" aria-hidden="true" />
							<span>{t("iosInstallHint")}</span>
						</p>
					)}
				</div>
			</CardContent>
			<CardFooter className="flex-row gap-2">
				{promptEvent && (
					<Button
						type="button"
						size="sm"
						className="flex-1"
						onClick={handleInstall}
					>
						<Download aria-hidden="true" />
						{t("installButton")}
					</Button>
				)}
				<Button
					type="button"
					size="sm"
					variant="ghost"
					onClick={() => setDismissed(true)}
				>
					{t("dismiss")}
				</Button>
			</CardFooter>
		</Card>
	);
}
