import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Calisthenics Quest",
		short_name: "Calisthenics",
		description:
			"Gamified calisthenics training with AI plans, quests, and offline workout logging.",
		start_url: "/today",
		display: "standalone",
		orientation: "portrait",
		background_color: "#f9f9f9",
		theme_color: "#59473e",
		icons: [
			{
				src: "/icons/icon-192.svg",
				sizes: "192x192",
				type: "image/svg+xml",
				purpose: "any",
			},
			{
				src: "/icons/icon-512.svg",
				sizes: "512x512",
				type: "image/svg+xml",
				purpose: "maskable",
			},
		],
		shortcuts: [
			{
				name: "Today's Quest",
				url: "/today",
			},
			{
				name: "Log Workout",
				url: "/today?tab=log",
			},
			{
				name: "Weekly Plan",
				url: "/today?tab=plan",
			},
			{
				name: "Body Tracking",
				url: "/profile?tab=body",
			},
		],
	};
}
