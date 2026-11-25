/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import {
	ExpirationPlugin,
	NetworkFirst,
	NetworkOnly,
	type PrecacheEntry,
	type RuntimeCaching,
	Serwist,
	type SerwistGlobalConfig,
	type SerwistPlugin,
} from "serwist";

declare global {
	interface WorkerGlobalScope extends SerwistGlobalConfig {
		__SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
	}
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Prevents caching HTTP redirects or streamed Next.js PPR `NEXT_REDIRECT`
 * responses (which return HTTP 200 with a `<meta id="__next-page-redirect">`
 * payload) so stale auth redirects can never be served from Cache Storage.
 */
const skipNextRedirectPlugin: SerwistPlugin = {
	cacheWillUpdate: async ({ response }) => {
		if (response?.status !== 200 || response.redirected) {
			return null;
		}
		const contentType = response.headers.get("content-type") ?? "";
		if (
			contentType.includes("text/html") ||
			contentType.includes("text/x-component")
		) {
			try {
				const text = await response.clone().text();
				if (
					text.includes("NEXT_REDIRECT") ||
					text.includes("__next-page-redirect")
				) {
					return null;
				}
			} catch {
				return null;
			}
		}
		return response;
	},
};

const authAndNavigationCache: RuntimeCaching[] = [
	{
		matcher: ({ sameOrigin, url: { pathname } }) =>
			sameOrigin &&
			(pathname === "/sign-in" ||
				pathname.startsWith("/sign-in/") ||
				pathname === "/onboarding" ||
				pathname.startsWith("/onboarding/") ||
				pathname.startsWith("/api/auth/")),
		handler: new NetworkOnly({ networkTimeoutSeconds: 10 }),
	},
	{
		matcher: ({ request, sameOrigin, url: { pathname } }) =>
			sameOrigin &&
			request.mode === "navigate" &&
			!pathname.startsWith("/api/"),
		handler: new NetworkFirst({
			cacheName: "pages",
			networkTimeoutSeconds: 10,
			plugins: [
				skipNextRedirectPlugin,
				new ExpirationPlugin({
					maxEntries: 32,
					maxAgeSeconds: 86400,
				}),
			],
		}),
	},
];

const serwist = new Serwist({
	precacheEntries: self.__SW_MANIFEST,
	skipWaiting: true,
	clientsClaim: true,
	navigationPreload: true,
	runtimeCaching: [...authAndNavigationCache, ...defaultCache],
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
