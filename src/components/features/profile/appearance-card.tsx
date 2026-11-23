"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Badge } from "@/components/reui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
		<Card size="sm">
			<CardHeader>
				<div className="flex items-center justify-between gap-2">
					<CardTitle>{t("title")}</CardTitle>
					{mounted && resolvedTheme && (
						<Badge variant="secondary" size="sm">
							{resolvedTheme === "dark" ? t("dark") : t("light")}
						</Badge>
					)}
				</div>
				<CardDescription>{t("description")}</CardDescription>
			</CardHeader>
			<CardContent>
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
			</CardContent>
		</Card>
	);
}
