import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { BodyTrackingView } from "@/components/features/body/body-tracking-view";
import { Frame, FramePanel } from "@/components/reui/frame";
import { requireOnboarded } from "@/lib/auth/session";
import { getBodyTrackingData } from "@/server/services/body-metric-service";

async function BodyContent() {
	const { session } = await requireOnboarded();
	const data = await getBodyTrackingData(session.user.id);

	return (
		<BodyTrackingView
			todayKey={data.todayKey}
			latestHeightCm={data.latestHeightCm}
			entries={data.entries}
		/>
	);
}

export default async function BodyPage() {
	const t = await getTranslations("body");
	return (
		<main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
			<div>
				<h1 className="font-semibold">{t("title")}</h1>
				<p className="text-sm text-muted-foreground">{t("subtitle")}</p>
			</div>
			<Suspense
				fallback={
					<Frame>
						<FramePanel className="h-48" />
					</Frame>
				}
			>
				<BodyContent />
			</Suspense>
		</main>
	);
}
