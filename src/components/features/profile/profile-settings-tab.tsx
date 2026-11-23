"use client";
import {
	Bell,
	CalendarHeart,
	ChevronRight,
	Loader2,
	LogOut,
	RotateCcw,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AppearanceCard } from "@/components/features/profile/appearance-card";
import { CycleSettingsCard } from "@/components/features/profile/cycle-settings-card";
import { DeleteAccountDialog } from "@/components/features/profile/delete-account-dialog";
import { PushRemindersCard } from "@/components/features/push/push-reminders-card";
import { Badge } from "@/components/reui/badge";
import {
	Frame,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@/components/reui/frame";
import { IconTile } from "@/components/reui/icon-tile";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { signOut } from "@/lib/auth/client";
import type { CycleRegularityValue } from "@/lib/wellness/cycle-and-wellness";

type SettingsSheet = "cycle" | "reminders" | null;

export type ProfileSettingsTabProps = {
	userEmail: string;
	isFemale: boolean;
	cycleSettings: {
		initialTracksPeriod: boolean;
		initialLastPeriodStartDate: string | null;
		initialAverageCycleDays: number;
		initialAveragePeriodDays: number;
		initialCycleRegularity: CycleRegularityValue;
		initialLutealPhaseDays: number;
		initialPeriodReminderEnabled: boolean;
		hasPushSubscription: boolean;
	};
	reminderSettings: {
		configured: boolean;
		publicVapidKey: string | null;
		initialEnabled: boolean;
		initialTime: string;
		subscriptionCount: number;
		trainingDaysCount: number;
		timezone: string;
	};
};

export function ProfileSettingsTab({
	userEmail,
	isFemale,
	cycleSettings,
	reminderSettings,
}: ProfileSettingsTabProps) {
	const t = useTranslations();
	const router = useRouter();
	const [activeSheet, setActiveSheet] = useState<SettingsSheet>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [signingOut, setSigningOut] = useState(false);

	const [tracksPeriod, setTracksPeriod] = useState(
		cycleSettings.initialTracksPeriod,
	);
	const [reminderEnabled, setReminderEnabled] = useState(
		reminderSettings.initialEnabled,
	);
	const [reminderTime, setReminderTime] = useState(
		reminderSettings.initialTime,
	);

	async function handleSignOut() {
		if (signingOut) return;
		setSigningOut(true);
		try {
			await signOut();
			router.replace("/sign-in");
			router.refresh();
		} finally {
			setSigningOut(false);
		}
	}

	return (
		<>
			<div className="flex flex-col gap-4">
				<AppearanceCard />

				<Frame spacing="sm">
					<FrameHeader>
						<FrameTitle>{t("profile.settings.preferencesTitle")}</FrameTitle>
					</FrameHeader>
					<FramePanel className="divide-y divide-border/70 px-0 py-0">
						{isFemale && (
							<button
								type="button"
								onClick={() => setActiveSheet("cycle")}
								className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/40"
							>
								<div className="flex min-w-0 flex-1 items-center gap-3">
									<IconTile variant="soft" size="sm">
										<CalendarHeart />
									</IconTile>
									<div className="min-w-0 flex-1">
										<div className="truncate text-sm font-medium">
											{t("profile.cycleSettings.title")}
										</div>
										<div className="truncate text-xs text-muted-foreground">
											{t("profile.settings.cycleRowDesc")}
										</div>
									</div>
								</div>
								<div className="flex shrink-0 items-center gap-2">
									<Badge
										variant={tracksPeriod ? "success-light" : "secondary"}
										size="sm"
									>
										{tracksPeriod
											? t("profile.cycleSettings.enabledBadge")
											: t("profile.cycleSettings.disabledBadge")}
									</Badge>
									<ChevronRight className="size-4 text-muted-foreground" />
								</div>
							</button>
						)}

						<button
							type="button"
							onClick={() => setActiveSheet("reminders")}
							className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/40"
						>
							<div className="flex min-w-0 flex-1 items-center gap-3">
								<IconTile variant="soft" size="sm">
									<Bell />
								</IconTile>
								<div className="min-w-0 flex-1">
									<div className="truncate text-sm font-medium">
										{t("reminders.title")}
									</div>
									<div className="truncate text-xs text-muted-foreground">
										{t("profile.settings.remindersRowDesc")}
									</div>
								</div>
							</div>
							<div className="flex shrink-0 items-center gap-2">
								<Badge
									variant={reminderEnabled ? "success-light" : "secondary"}
									size="sm"
								>
									{reminderEnabled
										? `${t("reminders.enabledBadge")} · ${reminderTime}`
										: t("reminders.disabledBadge")}
								</Badge>
								<ChevronRight className="size-4 text-muted-foreground" />
							</div>
						</button>
					</FramePanel>
				</Frame>

				<Frame spacing="sm">
					<FrameHeader>
						<FrameTitle>{t("profile.settings.accountTitle")}</FrameTitle>
					</FrameHeader>
					<FramePanel className="divide-y divide-border/70 px-0 py-0">
						<Link
							href="/onboarding"
							className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/40"
						>
							<div className="flex min-w-0 flex-1 items-center gap-3">
								<IconTile variant="soft" size="sm">
									<RotateCcw />
								</IconTile>
								<div className="min-w-0 flex-1">
									<div className="truncate text-sm font-medium">
										{t("profile.redo")}
									</div>
									<div className="truncate text-xs text-muted-foreground">
										{t("profile.settings.redoDesc")}
									</div>
								</div>
							</div>
							<ChevronRight className="size-4 shrink-0 text-muted-foreground" />
						</Link>

						<button
							type="button"
							disabled={signingOut}
							onClick={handleSignOut}
							className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted/45 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/40"
						>
							<div className="flex min-w-0 flex-1 items-center gap-3">
								<IconTile variant="soft" size="sm">
									<LogOut />
								</IconTile>
								<div className="min-w-0 flex-1">
									<div className="truncate text-sm font-medium">
										{t("common.signOut")}
									</div>
									<div className="truncate text-xs text-muted-foreground">
										{t("profile.settings.signOutDesc")}
									</div>
								</div>
							</div>
							{signingOut ? (
								<Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
							) : (
								<ChevronRight className="size-4 shrink-0 text-muted-foreground" />
							)}
						</button>
					</FramePanel>
				</Frame>

				<Frame spacing="sm">
					<FrameHeader>
						<FrameTitle className="text-destructive">
							{t("profile.settings.dangerTitle")}
						</FrameTitle>
					</FrameHeader>
					<FramePanel className="px-0 py-0">
						<button
							type="button"
							onClick={() => setDeleteDialogOpen(true)}
							className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-destructive/30"
						>
							<div className="flex min-w-0 flex-1 items-center gap-3">
								<div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive">
									<Trash2 className="size-4" />
								</div>
								<div className="min-w-0 flex-1">
									<div className="truncate text-sm font-medium text-destructive">
										{t("profile.settings.deleteRowTitle")}
									</div>
									<div className="truncate text-xs text-muted-foreground">
										{t("profile.settings.deleteRowDesc")}
									</div>
								</div>
							</div>
							<ChevronRight className="size-4 shrink-0 text-destructive/70" />
						</button>
					</FramePanel>
				</Frame>
			</div>

			{isFemale && (
				<Sheet
					open={activeSheet === "cycle"}
					onOpenChange={(open) => {
						if (!open) setActiveSheet(null);
					}}
				>
					<SheetContent
						side="bottom"
						className="mx-auto max-h-[85dvh] max-w-md overflow-y-auto rounded-t-3xl"
					>
						<SheetHeader>
							<div className="flex flex-wrap items-center gap-2 pr-8">
								<SheetTitle>{t("profile.cycleSettings.title")}</SheetTitle>
								<Badge
									variant={tracksPeriod ? "success-light" : "secondary"}
									size="sm"
								>
									{tracksPeriod
										? t("profile.cycleSettings.enabledBadge")
										: t("profile.cycleSettings.disabledBadge")}
								</Badge>
							</div>
							<SheetDescription>
								{t("profile.cycleSettings.description")}
							</SheetDescription>
						</SheetHeader>
						<CycleSettingsCard
							embedded
							{...cycleSettings}
							onSaved={({ tracksPeriod: next }) => setTracksPeriod(next)}
						/>
					</SheetContent>
				</Sheet>
			)}

			<Sheet
				open={activeSheet === "reminders"}
				onOpenChange={(open) => {
					if (!open) setActiveSheet(null);
				}}
			>
				<SheetContent
					side="bottom"
					className="mx-auto max-h-[85dvh] max-w-md overflow-y-auto rounded-t-3xl"
				>
					<SheetHeader>
						<div className="flex flex-wrap items-center gap-2 pr-8">
							<SheetTitle>{t("reminders.title")}</SheetTitle>
							<Badge
								variant={reminderEnabled ? "success-light" : "secondary"}
								size="sm"
							>
								{reminderEnabled
									? t("reminders.enabledBadge")
									: t("reminders.disabledBadge")}
							</Badge>
						</div>
						<SheetDescription>{t("reminders.description")}</SheetDescription>
					</SheetHeader>
					<PushRemindersCard
						embedded
						{...reminderSettings}
						onStateChange={(next) => {
							setReminderEnabled(next.enabled);
							setReminderTime(next.reminderTime);
						}}
					/>
				</SheetContent>
			</Sheet>

			<DeleteAccountDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				userEmail={userEmail}
			/>
		</>
	);
}
