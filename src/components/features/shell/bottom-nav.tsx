"use client";
import {
	Calendar,
	ClipboardCheck,
	Dumbbell,
	Scale,
	Swords,
	User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const ITEMS = [
	{ href: "/today", key: "today", icon: Swords },
	{ href: "/plan", key: "plan", icon: Calendar },
	{ href: "/log", key: "log", icon: ClipboardCheck },
	{ href: "/body", key: "body", icon: Scale },
	{ href: "/exercises", key: "exercises", icon: Dumbbell },
	{ href: "/profile", key: "profile", icon: User },
] as const;

export function BottomNav() {
	const t = useTranslations("nav");
	const pathname = usePathname();
	return (
		<nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
			<ul className="mx-auto flex max-w-md gap-1 p-1.5">
				{ITEMS.map(({ href, key, icon: Icon }) => {
					const active = pathname.startsWith(href);
					return (
						<li key={href} className="min-w-0 flex-1">
							<Button
								variant={active ? "secondary" : "ghost"}
								size="xs"
								className="h-auto w-full flex-col gap-0.5 px-1 py-1.5"
								nativeButton={false}
								render={<Link href={href} />}
							>
								<Icon />
								<span className="max-w-full truncate">{t(key)}</span>
							</Button>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
