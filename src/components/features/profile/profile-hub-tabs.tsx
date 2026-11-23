"use client";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ProfileTab = "overview" | "metrics" | "body" | "settings";

export function ProfileHubTabs({
	initialTab,
	overviewContent,
	metricsContent,
	bodyContent,
	settingsContent,
}: {
	initialTab: ProfileTab;
	overviewContent: React.ReactNode;
	metricsContent: React.ReactNode;
	bodyContent: React.ReactNode;
	settingsContent: React.ReactNode;
}) {
	const t = useTranslations("profileHub");
	const [tab, setTab] = useState<ProfileTab>(initialTab);

	useEffect(() => {
		setTab(initialTab);
	}, [initialTab]);

	return (
		<Tabs
			value={tab}
			onValueChange={(next) => setTab(String(next) as ProfileTab)}
			className="flex flex-col gap-4"
		>
			<TabsList className="w-full">
				<TabsTrigger
					value="overview"
					className="flex-auto px-2 text-xs sm:px-3 sm:text-sm"
				>
					{t("overviewTab")}
				</TabsTrigger>
				<TabsTrigger
					value="metrics"
					className="flex-auto px-2 text-xs sm:px-3 sm:text-sm"
				>
					{t("metricsTab")}
				</TabsTrigger>
				<TabsTrigger
					value="body"
					className="flex-auto px-2 text-xs sm:px-3 sm:text-sm"
				>
					{t("bodyTab")}
				</TabsTrigger>
				<TabsTrigger
					value="settings"
					className="flex-auto px-2 text-xs sm:px-3 sm:text-sm"
				>
					{t("settingsTab")}
				</TabsTrigger>
			</TabsList>

			<TabsContent value="overview" className="flex flex-col gap-4">
				{overviewContent}
			</TabsContent>

			<TabsContent value="metrics" className="flex flex-col gap-4">
				{metricsContent}
			</TabsContent>

			<TabsContent value="body" className="flex flex-col gap-4">
				{bodyContent}
			</TabsContent>

			<TabsContent value="settings" className="flex flex-col gap-4">
				{settingsContent}
			</TabsContent>
		</Tabs>
	);
}
