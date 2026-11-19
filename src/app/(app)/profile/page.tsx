import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { SignOutButton } from "@/components/features/auth/sign-out-button";
import { Badge } from "@/components/reui/badge";
import {
	Frame,
	FrameDescription,
	FrameFooter,
	FramePanel,
	FrameTitle,
} from "@/components/reui/frame";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { requireOnboarded } from "@/lib/auth/session";

function getInitials(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
}

async function ProfileDetails() {
	const t = await getTranslations();
	const { session, profile } = await requireOnboarded();

	return (
		<Frame>
			<FramePanel className="flex items-center gap-3">
				<Avatar size="lg">
					{session.user.image && (
						<AvatarImage src={session.user.image} alt={session.user.name} />
					)}
					<AvatarFallback>{getInitials(session.user.name)}</AvatarFallback>
				</Avatar>
				<div className="min-w-0">
					<FrameTitle className="truncate">{session.user.name}</FrameTitle>
					<FrameDescription className="truncate">
						{session.user.email}
					</FrameDescription>
				</div>
			</FramePanel>

			<FramePanel className="flex flex-col gap-3">
				<div className="flex items-center justify-between gap-2 text-sm">
					<span className="text-muted-foreground">{t("profile.level")}</span>
					<Badge variant="secondary">
						{t(`onboarding.experience.${profile.experienceLevel}`)}
					</Badge>
				</div>
				<div className="flex items-start justify-between gap-2 text-sm">
					<span className="text-muted-foreground">{t("profile.days")}</span>
					<div className="flex flex-wrap justify-end gap-1">
						{profile.trainingDays.map((day) => (
							<Badge key={day} variant="outline">
								{t(
									`onboarding.schedule.dayNames.${day}` as "onboarding.schedule.dayNames.0",
								)}
							</Badge>
						))}
					</div>
				</div>
			</FramePanel>

			<FrameFooter>
				<Button
					variant="secondary"
					className="w-full"
					nativeButton={false}
					render={<Link href="/onboarding" />}
				>
					{t("profile.redo")}
				</Button>
				<SignOutButton />
			</FrameFooter>
		</Frame>
	);
}

export default async function ProfilePage() {
	const t = await getTranslations("profile");
	return (
		<main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
			<h1 className="font-semibold">{t("title")}</h1>
			<Suspense
				fallback={
					<Frame>
						<FramePanel className="h-32" />
					</Frame>
				}
			>
				<ProfileDetails />
			</Suspense>
		</main>
	);
}
