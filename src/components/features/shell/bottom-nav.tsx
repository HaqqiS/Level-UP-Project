"use client";

import { cn } from "cn";
import { motion, useReducedMotion } from "framer-motion";
import {
	Calendar,
	Dumbbell,
	type LucideIcon,
	Swords,
	User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
	isNavItemActive,
	NAV_ROUTES,
	type NavItemKey,
} from "./bottom-nav-utils";

const NAV_ICONS: Record<NavItemKey, LucideIcon> = {
	train: Swords,
	calendar: Calendar,
	exercises: Dumbbell,
	profile: User,
};

export function BottomNav() {
	const t = useTranslations("nav");
	const pathname = usePathname();
	const prefersReducedMotion = useReducedMotion();

	return (
		<div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
			<nav
				aria-label={t("ariaLabel")}
				className="pointer-events-auto mx-auto w-full max-w-[calc(28rem-2rem)] rounded-full border border-border/75 bg-popover/78 p-1 shadow-[0_8px_24px_-6px_oklch(0_0_0/0.12),inset_0_1px_0_0_oklch(1_0_0/0.65)] backdrop-blur-xl backdrop-saturate-150 dark:border-foreground/12 dark:bg-popover/72 dark:shadow-[0_10px_28px_-6px_oklch(0_0_0/0.55),inset_0_1px_0_0_oklch(1_0_0/0.14)]"
			>
				<ul className="grid grid-cols-4 items-center gap-0.5">
					{NAV_ROUTES.map(({ key, href }) => {
						const Icon = NAV_ICONS[key];
						const active = isNavItemActive(pathname, key);

						return (
							<li key={href} className="min-w-0">
								<Link
									href={href}
									aria-current={active ? "page" : undefined}
									className={cn(
										"relative flex min-h-[44px] w-full flex-col items-center justify-center gap-0.5 rounded-full px-1.5 py-1 transition-[color,transform] duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
										active
											? "text-primary"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									{active && (
										<motion.span
											layoutId="apple-tab-indicator"
											aria-hidden="true"
											transition={
												prefersReducedMotion
													? { duration: 0 }
													: {
															type: "spring",
															stiffness: 420,
															damping: 34,
															mass: 0.8,
														}
											}
											className="absolute inset-0 rounded-full bg-secondary/90 ring-1 ring-primary/15 dark:bg-primary/14 dark:ring-primary/20"
										/>
									)}
									<Icon
										className="relative z-10 size-4 shrink-0"
										strokeWidth={active ? 2.25 : 1.75}
										aria-hidden="true"
									/>
									<span
										className={cn(
											"relative z-10 max-w-full truncate text-[11px] leading-tight tracking-[-0.01em]",
											active ? "font-semibold" : "font-medium",
										)}
									>
										{t(key)}
									</span>
								</Link>
							</li>
						);
					})}
				</ul>
			</nav>
		</div>
	);
}
