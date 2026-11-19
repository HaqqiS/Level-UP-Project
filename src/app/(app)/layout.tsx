import { Suspense } from "react";
import { BottomNav } from "@/components/features/shell/bottom-nav";
import { requireOnboarded } from "@/lib/auth/session";

async function Gate({ children }: { children: React.ReactNode }) {
	await requireOnboarded();
	return <>{children}</>;
}

export default function AppLayout({ children }: LayoutProps<"/">) {
	return (
		<div className="flex min-h-dvh flex-col pb-14">
			<Suspense fallback={<div className="flex-1" />}>
				<Gate>{children}</Gate>
			</Suspense>
			<BottomNav />
		</div>
	);
}
