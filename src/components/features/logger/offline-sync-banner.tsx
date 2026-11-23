"use client";
import { RefreshCw, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import {
	Alert,
	AlertAction,
	AlertDescription,
	AlertTitle,
} from "@/components/reui/alert";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";

export function OfflineSyncBanner({
	isOnline,
	isSyncing,
	pendingCount,
	onSyncNow,
}: {
	isOnline: boolean;
	isSyncing: boolean;
	pendingCount: number;
	onSyncNow: () => void;
}) {
	const t = useTranslations("offline");

	if (isOnline && pendingCount === 0) {
		return null;
	}

	if (!isOnline) {
		return (
			<Alert variant="warning">
				<WifiOff />
				<AlertTitle>{t("offlineTitle")}</AlertTitle>
				<AlertDescription>
					{t("offlineDescription", { count: pendingCount })}
				</AlertDescription>
				{pendingCount > 0 && (
					<AlertAction>
						<Badge variant="warning-light" size="sm">
							{pendingCount}
						</Badge>
					</AlertAction>
				)}
			</Alert>
		);
	}

	return (
		<Alert variant="info">
			<RefreshCw className={isSyncing ? "animate-spin" : undefined} />
			<AlertTitle>{t("pendingTitle")}</AlertTitle>
			<AlertDescription>
				{t("pendingDescription", { count: pendingCount })}
			</AlertDescription>
			<AlertAction>
				<Button
					size="xs"
					variant="outline"
					disabled={isSyncing}
					onClick={onSyncNow}
				>
					{isSyncing ? t("syncing") : t("syncNow")}
				</Button>
			</AlertAction>
		</Alert>
	);
}
