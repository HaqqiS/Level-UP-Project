"use client";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ProfileTab = "overview" | "body" | "settings";

export function ProfileHubTabs({
	initialTab,
	overviewContent,
	bodyContent,
	settingsContent,
}: {
	initialTab: ProfileTab;
	overviewContent: React.ReactNode;
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
				<TabsTrigger value="overview">{t("overviewTab")}</TabsTrigger>
				<TabsTrigger value="body">{t("bodyTab")}</TabsTrigger>
				<TabsTrigger value="settings">{t("settingsTab")}</TabsTrigger>
			</TabsList>

			<TabsContent value="overview" className="flex flex-col gap-4">
				{overviewContent}
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
