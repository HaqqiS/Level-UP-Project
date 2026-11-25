import { Suspense } from "react";
import { BottomNav } from "@/components/features/shell/bottom-nav";
import { TimezoneSync } from "@/components/features/shell/timezone-sync";
import { requireOnboarded } from "@/lib/auth/session";

async function Gate({ children }: { children: React.ReactNode }) {
	const { profile } = await requireOnboarded();
	return (
		<>
			<TimezoneSync currentTimezone={profile.timezone} />
			{children}
		</>
	);
}

export default function AppLayout({ children }: LayoutProps<"/">) {
	return (
		<div className="flex min-h-dvh flex-col pb-[calc(5rem+env(safe-area-inset-bottom))]">
			<Suspense fallback={<div className="flex-1" />}>
				<Gate>{children}</Gate>
			</Suspense>
			<BottomNav />
		</div>
	);
}
