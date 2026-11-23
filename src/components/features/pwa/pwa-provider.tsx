"use client";
import { SerwistProvider } from "@serwist/next/react";
import { useEffect } from "react";

export function PwaProvider({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		if (process.env.NODE_ENV !== "development") return;

		if ("serviceWorker" in navigator) {
			navigator.serviceWorker
				.getRegistrations()
				.then((registrations) =>
					Promise.all(registrations.map((reg) => reg.unregister())),
				)
				.catch(() => {});
		}

		if ("caches" in window) {
			window.caches
				.keys()
				.then((keys) =>
					Promise.all(keys.map((key) => window.caches.delete(key))),
				)
				.catch(() => {});
		}
	}, []);

	return (
		<SerwistProvider
			swUrl="/sw.js"
			reloadOnOnline={false}
			disable={process.env.NODE_ENV === "development"}
		>
			{children}
		</SerwistProvider>
	);
}
