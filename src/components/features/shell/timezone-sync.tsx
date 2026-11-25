"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { syncUserTimezoneAction } from "@/server/actions/account";

const STORAGE_KEY = "cq-tz-synced";

export function TimezoneSync({ currentTimezone }: { currentTimezone: string }) {
	const router = useRouter();

	useEffect(() => {
		let detected: string | undefined;
		try {
			detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
		} catch {
			return;
		}
		if (!detected || detected === currentTimezone) return;

		try {
			if (window.sessionStorage.getItem(STORAGE_KEY) === detected) return;
		} catch {
			// Ignore sessionStorage restrictions in private mode.
		}

		let cancelled = false;
		void syncUserTimezoneAction(detected)
			.then((res) => {
				if (cancelled || !res.ok) return;
				try {
					window.sessionStorage.setItem(STORAGE_KEY, detected);
				} catch {
					// Ignore storage failures.
				}
				if (res.updated) {
					router.refresh();
				}
			})
			.catch(() => {});

		return () => {
			cancelled = true;
		};
	}, [currentTimezone, router]);

	return null;
}
