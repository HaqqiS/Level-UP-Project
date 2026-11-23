"use client";
import { Bell, BellOff, Loader2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/reui/alert";
import { Badge } from "@/components/reui/badge";
import {
	TimePicker,
	TimePickerColumns,
	TimePickerConfirm,
	TimePickerContent,
	TimePickerFooter,
	TimePickerNow,
	TimePickerTrigger,
} from "@/components/reui/time-picker";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { REMINDER_TIME_PRESETS } from "@/lib/push/reminder-logic";
import {
	removePushSubscriptionAction,
	savePushSubscriptionAction,
	sendTestPushReminderAction,
	updateReminderSettingsAction,
} from "@/server/actions/push";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
	const rawData = window.atob(base64);
	const buffer = new ArrayBuffer(rawData.length);
	const outputArray = new Uint8Array(buffer);
	for (let i = 0; i < rawData.length; i++) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

export function PushRemindersCard({
	configured,
	publicVapidKey,
	initialEnabled,
	initialTime,
	subscriptionCount,
	trainingDaysCount,
	timezone,
	embedded = false,
	onStateChange,
}: {
	configured: boolean;
	publicVapidKey: string | null;
	initialEnabled: boolean;
	initialTime: string;
	subscriptionCount: number;
	trainingDaysCount: number;
	timezone: string;
	embedded?: boolean;
	onStateChange?: (next: { enabled: boolean; reminderTime: string }) => void;
}) {
	const t = useTranslations();
	const [enabled, setEnabled] = useState(initialEnabled);
	const [reminderTime, setReminderTime] = useState(initialTime);
	const [activeSubCount, setActiveSubCount] = useState(subscriptionCount);
	const [browserSupported, setBrowserSupported] = useState(true);
	const [permissionDenied, setPermissionDenied] = useState(false);
	const [pending, startTransition] = useTransition();
	const [testing, setTesting] = useState(false);

	useEffect(() => {
		const supported =
			typeof window !== "undefined" &&
			"Notification" in window &&
			"serviceWorker" in navigator &&
			"PushManager" in window;
		setBrowserSupported(supported);
		if (supported && Notification.permission === "denied") {
			setPermissionDenied(true);
		}
	}, []);

	function handleEnable() {
		if (!publicVapidKey || !configured) return;

		startTransition(async () => {
			try {
				const registration = await navigator.serviceWorker.getRegistration();
				if (!registration) {
					toast.error(t("reminders.swInactive"));
					return;
				}

				const permission = await Notification.requestPermission();
				if (permission !== "granted") {
					setPermissionDenied(permission === "denied");
					toast.error(t("reminders.permissionDenied"));
					return;
				}
				setPermissionDenied(false);

				let subscription = await registration.pushManager.getSubscription();
				if (!subscription) {
					subscription = await registration.pushManager.subscribe({
						userVisibleOnly: true,
						applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
					});
				}

				const json = subscription.toJSON();
				const p256dh = json.keys?.p256dh;
				const auth = json.keys?.auth;
				if (!json.endpoint || !p256dh || !auth) {
					toast.error(t("common.error"));
					return;
				}

				const subRes = await savePushSubscriptionAction({
					endpoint: json.endpoint,
					keys: { p256dh, auth },
				});
				if (!subRes.ok) {
					toast.error(t("common.error"));
					return;
				}

				const settingsRes = await updateReminderSettingsAction({
					reminderEnabled: true,
					reminderTime,
				});
				if (!settingsRes.ok) {
					toast.error(t("common.error"));
					return;
				}

				setEnabled(true);
				setActiveSubCount((c) => Math.max(1, c));
				onStateChange?.({ enabled: true, reminderTime });
				toast.success(t("reminders.enabledToast"));
			} catch {
				toast.error(t("common.error"));
			}
		});
	}

	function handleDisable() {
		startTransition(async () => {
			try {
				if (typeof window !== "undefined" && "serviceWorker" in navigator) {
					const registration = await navigator.serviceWorker.getRegistration();
					const existing = await registration?.pushManager.getSubscription();
					if (existing) {
						await removePushSubscriptionAction(existing.endpoint);
						await existing.unsubscribe();
					}
				}

				const res = await updateReminderSettingsAction({
					reminderEnabled: false,
					reminderTime,
				});
				if (!res.ok) {
					toast.error(t("common.error"));
					return;
				}

				setEnabled(false);
				setActiveSubCount(0);
				onStateChange?.({ enabled: false, reminderTime });
				toast.success(t("reminders.disabledToast"));
			} catch {
				toast.error(t("common.error"));
			}
		});
	}

	function handleSaveTime(nextTime = reminderTime) {
		startTransition(async () => {
			const res = await updateReminderSettingsAction({
				reminderEnabled: enabled,
				reminderTime: nextTime,
			});
			if (res.ok) {
				onStateChange?.({ enabled, reminderTime: res.reminderTime });
				toast.success(
					t("reminders.timeSavedToast", { time: res.reminderTime }),
				);
			} else {
				toast.error(t("common.error"));
			}
		});
	}

	async function handleSendTest() {
		setTesting(true);
		try {
			const res = await sendTestPushReminderAction();
			if (res.ok) {
				toast.success(t("reminders.testSentToast"));
			} else {
				toast.error(t("reminders.testFailedToast"));
			}
		} catch {
			toast.error(t("common.error"));
		} finally {
			setTesting(false);
		}
	}

	const presetValue = (REMINDER_TIME_PRESETS as readonly string[]).includes(
		reminderTime,
	)
		? [reminderTime]
		: [];

	const statusAlert =
		!configured || !publicVapidKey ? (
			<Alert variant="info">
				<AlertDescription>{t("reminders.notConfigured")}</AlertDescription>
			</Alert>
		) : !browserSupported ? (
			<Alert variant="info">
				<AlertDescription>{t("reminders.unsupported")}</AlertDescription>
			</Alert>
		) : null;

	const settingsFields = (
		<>
			{permissionDenied && (
				<Alert variant="warning">
					<AlertDescription>{t("reminders.permissionDenied")}</AlertDescription>
				</Alert>
			)}

			<FieldGroup className="gap-4">
				<Field>
					<FieldLabel>{t("reminders.timeLabel")}</FieldLabel>
					<ToggleGroup
						variant="outline"
						spacing={1}
						className="grid w-full grid-cols-3 gap-1.5"
						value={presetValue}
						onValueChange={(values) => {
							const picked = values[0];
							if (picked) {
								setReminderTime(picked);
							}
						}}
					>
						{REMINDER_TIME_PRESETS.map((preset) => (
							<ToggleGroupItem
								key={preset}
								value={preset}
								className="w-full justify-center"
							>
								{preset}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
				</Field>

				<Field>
					<FieldLabel
						id="reminder-custom-time-label"
						htmlFor="reminder-custom-time"
					>
						{t("reminders.customTimeLabel")}
					</FieldLabel>
					<div className="flex items-center gap-2">
						<TimePicker
							id="reminder-custom-time"
							aria-labelledby="reminder-custom-time-label"
							hourCycle={24}
							granularity="minute"
							disabled={pending}
							value={reminderTime}
							onValueChange={(next) => {
								if (next) {
									setReminderTime(next);
								}
							}}
						>
							<TimePickerTrigger
								className="min-w-0 flex-1"
								placeholder={t("reminders.timePlaceholder")}
							/>
							<TimePickerContent>
								<TimePickerColumns />
								<TimePickerFooter>
									<TimePickerNow />
									<TimePickerConfirm />
								</TimePickerFooter>
							</TimePickerContent>
						</TimePicker>
						{enabled && (
							<Button
								type="button"
								variant="outline"
								disabled={pending}
								onClick={() => handleSaveTime(reminderTime)}
							>
								{pending
									? t("reminders.saving")
									: t("reminders.saveTimeButton")}
							</Button>
						)}
					</div>
				</Field>
			</FieldGroup>

			<p className="text-sm text-muted-foreground">
				{t("reminders.scheduleHint", {
					days: trainingDaysCount,
					timezone,
				})}
			</p>
		</>
	);

	const actionButtons =
		!enabled || activeSubCount === 0 ? (
			<Button className="flex-1" disabled={pending} onClick={handleEnable}>
				{pending ? <Loader2 className="animate-spin" /> : <Bell />}
				{pending ? t("reminders.enabling") : t("reminders.enableButton")}
			</Button>
		) : (
			<>
				<Button
					variant="outline"
					className="flex-1"
					disabled={testing || pending}
					onClick={handleSendTest}
				>
					{testing ? <Loader2 className="animate-spin" /> : <Send />}
					{testing ? t("reminders.sendingTest") : t("reminders.testButton")}
				</Button>
				<Button variant="ghost" disabled={pending} onClick={handleDisable}>
					<BellOff />
					{pending ? t("reminders.disabling") : t("reminders.disableButton")}
				</Button>
			</>
		);

	if (embedded) {
		return statusAlert ? (
			<div className="px-6 pb-6">{statusAlert}</div>
		) : (
			<div className="space-y-4 px-6 pb-6">
				{settingsFields}
				<div className="flex flex-wrap gap-2">{actionButtons}</div>
			</div>
		);
	}

	return (
		<Card size="sm">
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<CardTitle>{t("reminders.title")}</CardTitle>
					<Badge variant={enabled ? "success-light" : "secondary"} size="sm">
						{enabled
							? t("reminders.enabledBadge")
							: t("reminders.disabledBadge")}
					</Badge>
				</div>
				<CardDescription>{t("reminders.description")}</CardDescription>
			</CardHeader>

			{statusAlert ? (
				<CardContent>{statusAlert}</CardContent>
			) : (
				<>
					<CardContent className="space-y-4">{settingsFields}</CardContent>

					<CardFooter className="flex-row flex-wrap gap-2">
						{actionButtons}
					</CardFooter>
				</>
			)}
		</Card>
	);
}
