"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Badge } from "@/components/reui/badge";
import {
	Frame,
	FrameDescription,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@/components/reui/frame";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const emptySubscribe = () => () => {};

export function AppearanceCard() {
	const t = useTranslations("theme");
	const { theme, resolvedTheme, setTheme } = useTheme();
	const mounted = useSyncExternalStore(
		emptySubscribe,
		() => true,
		() => false,
	);

	return (
		<Frame spacing="sm">
			<FrameHeader>
				<div className="flex items-center justify-between gap-2">
					<FrameTitle>{t("title")}</FrameTitle>
					{mounted && resolvedTheme && (
						<Badge variant="secondary" size="sm">
							{resolvedTheme === "dark" ? t("dark") : t("light")}
						</Badge>
					)}
				</div>
				<FrameDescription>{t("description")}</FrameDescription>
			</FrameHeader>
			<FramePanel>
				<ToggleGroup
					variant="outline"
					size="sm"
					className="w-full"
					value={mounted ? [theme ?? "system"] : []}
					onValueChange={(vals) => {
						const next = vals[0];
						if (next === "light" || next === "dark" || next === "system") {
							setTheme(next);
						}
					}}
				>
					<ToggleGroupItem value="light" className="flex-1">
						<Sun className="size-3.5" />
						<span>{t("light")}</span>
					</ToggleGroupItem>
					<ToggleGroupItem value="dark" className="flex-1">
						<Moon className="size-3.5" />
						<span>{t("dark")}</span>
					</ToggleGroupItem>
					<ToggleGroupItem value="system" className="flex-1">
						<Monitor className="size-3.5" />
						<span>{t("system")}</span>
					</ToggleGroupItem>
				</ToggleGroup>
			</FramePanel>
		</Frame>
	);
}
