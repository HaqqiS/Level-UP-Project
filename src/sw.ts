/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import { type PrecacheEntry, Serwist, type SerwistGlobalConfig } from "serwist";

declare global {
	interface WorkerGlobalScope extends SerwistGlobalConfig {
		__SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
	}
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
	precacheEntries: self.__SW_MANIFEST,
	skipWaiting: true,
	clientsClaim: true,
	navigationPreload: true,
	runtimeCaching: defaultCache,
});

serwist.addEventListeners();

self.addEventListener("push", (event) => {
	let title = "Calisthenics Quest";
	let body = "Your next calisthenics session is ready.";
	let url = "/today";

	if (event.data) {
		try {
			const parsed = event.data.json() as {
				title?: string;
				body?: string;
				url?: string;
			};
			if (parsed.title) title = parsed.title;
			if (parsed.body) body = parsed.body;
			if (parsed.url) url = parsed.url;
		} catch {
			const text = event.data.text();
			if (text) body = text;
		}
	}

	event.waitUntil(
		self.registration.showNotification(title, {
			body,
			icon: "/icons/icon-192.svg",
			badge: "/icons/icon-192.svg",
			data: { url },
		}),
	);
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const rawUrl = (event.notification.data as { url?: string } | undefined)?.url;
	const targetUrl =
		typeof rawUrl === "string" && rawUrl.startsWith("/") ? rawUrl : "/today";

	event.waitUntil(
		self.clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then(async (clients) => {
				for (const client of clients) {
					if (
						"focus" in client &&
						client.url.startsWith(self.location.origin)
					) {
						await client.focus();
						if ("navigate" in client) {
							await client.navigate(targetUrl);
						}
						return;
					}
				}
				return self.clients.openWindow(targetUrl);
			}),
	);
});
