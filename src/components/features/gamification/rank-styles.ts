import type { RankTier } from "@/lib/gamification/engine";

export type RankTierStyle = {
	badgeClass: string;
	emblemClass: string;
	cardAccentClass: string;
	ringClass: string;
};

export const RANK_STYLES: Record<RankTier, RankTierStyle> = {
	F: {
		badgeClass:
			"border-zinc-400/35 bg-zinc-500/10 text-zinc-700 dark:border-zinc-500/35 dark:bg-zinc-400/15 dark:text-zinc-300",
		emblemClass:
			"bg-zinc-500/15 text-zinc-800 ring-1 ring-zinc-400/30 dark:bg-zinc-400/15 dark:text-zinc-200 dark:ring-zinc-500/30",
		cardAccentClass: "bg-zinc-500/[0.05] dark:bg-zinc-400/[0.08]",
		ringClass: "ring-1 ring-zinc-400/25 dark:ring-zinc-500/25",
	},
	E: {
		badgeClass:
			"border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-300",
		emblemClass:
			"bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-500/30 dark:bg-emerald-400/20 dark:text-emerald-300 dark:ring-emerald-400/35",
		cardAccentClass: "bg-emerald-500/[0.06] dark:bg-emerald-400/[0.08]",
		ringClass: "ring-1 ring-emerald-500/25 dark:ring-emerald-400/30",
	},
	D: {
		badgeClass:
			"border-sky-500/35 bg-sky-500/12 text-sky-800 dark:border-sky-400/35 dark:bg-sky-400/15 dark:text-sky-300",
		emblemClass:
			"bg-sky-500/15 text-sky-800 ring-1 ring-sky-500/35 dark:bg-sky-400/20 dark:text-sky-300 dark:ring-sky-400/35",
		cardAccentClass: "bg-sky-500/[0.07] dark:bg-sky-400/[0.09]",
		ringClass: "ring-1 ring-sky-500/30 dark:ring-sky-400/35",
	},
	C: {
		badgeClass:
			"border-indigo-500/35 bg-indigo-500/12 text-indigo-800 dark:border-indigo-400/35 dark:bg-indigo-400/15 dark:text-indigo-300",
		emblemClass:
			"bg-indigo-500/18 text-indigo-800 ring-1 ring-indigo-500/40 dark:bg-indigo-400/20 dark:text-indigo-300 dark:ring-indigo-400/40",
		cardAccentClass: "bg-indigo-500/[0.08] dark:bg-indigo-400/[0.10]",
		ringClass: "ring-1 ring-indigo-500/35 dark:ring-indigo-400/35",
	},
	B: {
		badgeClass:
			"border-amber-500/40 bg-amber-500/15 text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/18 dark:text-amber-300",
		emblemClass:
			"bg-amber-500/20 text-amber-800 ring-1 ring-amber-500/40 dark:bg-amber-400/20 dark:text-amber-300 dark:ring-amber-400/45",
		cardAccentClass: "bg-amber-500/[0.09] dark:bg-amber-400/[0.11]",
		ringClass: "ring-1 ring-amber-500/35 dark:ring-amber-400/40",
	},
	A: {
		badgeClass:
			"border-rose-500/40 bg-rose-500/15 text-rose-800 dark:border-rose-400/40 dark:bg-rose-400/18 dark:text-rose-300",
		emblemClass:
			"bg-rose-500/20 text-rose-800 ring-1 ring-rose-500/45 dark:bg-rose-400/22 dark:text-rose-300 dark:ring-rose-400/45",
		cardAccentClass: "bg-rose-500/[0.09] dark:bg-rose-400/[0.12]",
		ringClass: "ring-1 ring-rose-500/40 dark:ring-rose-400/40",
	},
	S: {
		badgeClass:
			"border-yellow-500/50 bg-yellow-500/18 text-yellow-900 dark:border-yellow-400/45 dark:bg-yellow-400/20 dark:text-yellow-200",
		emblemClass:
			"bg-yellow-500/22 text-yellow-900 ring-1 ring-yellow-500/50 dark:bg-yellow-400/22 dark:text-yellow-200 dark:ring-yellow-400/50",
		cardAccentClass: "bg-yellow-500/[0.11] dark:bg-yellow-400/[0.13]",
		ringClass: "ring-1 ring-yellow-500/40 dark:ring-yellow-400/40",
	},
};
