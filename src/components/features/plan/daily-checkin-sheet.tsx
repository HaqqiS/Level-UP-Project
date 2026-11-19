"use client";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { toggleItem } from "@/components/features/onboarding/steps/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "@/components/ui/field";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { INJURIES, SESSION_MINUTES } from "@/lib/validation/onboarding";
import { submitDailyCheckinAction } from "@/server/actions/plan";

const SCALE = [1, 2, 3, 4, 5] as const;

export function DailyCheckinSheet({
	sessionId,
	defaultMinutes,
}: {
	sessionId: string;
	defaultMinutes: number;
}) {
	const t = useTranslations();
	const [open, setOpen] = useState(false);
	const [energy, setEnergy] = useState<number>(3);
	const [soreness, setSoreness] = useState<number>(2);
	const [minutesAvailable, setMinutesAvailable] = useState<number>(
		SESSION_MINUTES.includes(defaultMinutes as (typeof SESSION_MINUTES)[number])
			? defaultMinutes
			: 30,
	);
	const [painAreas, setPainAreas] = useState<(typeof INJURIES)[number][]>([]);
	const [pending, startTransition] = useTransition();

	function handleSubmit() {
		startTransition(async () => {
			const result = await submitDailyCheckinAction({
				sessionId,
				energy,
				soreness,
				painAreas,
				minutesAvailable: minutesAvailable as (typeof SESSION_MINUTES)[number],
			});

			if (!result.ok) {
				toast.error(
					result.reason === "already_checked_in"
						? t("checkin.alreadyDone")
						: t("common.error"),
				);
				return;
			}

			if (result.fallbackUsed) {
				toast.info(t("checkin.fallback"));
			} else {
				toast.success(t("checkin.success"));
			}
			setOpen(false);
		});
	}

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger render={<Button variant="outline" className="w-full" />}>
				<SlidersHorizontal />
				{t("checkin.button")}
			</SheetTrigger>
			<SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
				<SheetHeader>
					<SheetTitle>{t("checkin.title")}</SheetTitle>
					<SheetDescription>{t("checkin.description")}</SheetDescription>
				</SheetHeader>

				<div className="px-6">
					<FieldGroup>
						<FieldSet>
							<FieldLegend variant="label">{t("checkin.energy")}</FieldLegend>
							<ToggleGroup
								variant="outline"
								value={[String(energy)]}
								onValueChange={(vals) => {
									const v = vals[0];
									if (v) setEnergy(Number(v));
								}}
							>
								{SCALE.map((n) => (
									<ToggleGroupItem key={n} value={String(n)}>
										{n}
									</ToggleGroupItem>
								))}
							</ToggleGroup>
						</FieldSet>

						<FieldSet>
							<FieldLegend variant="label">{t("checkin.soreness")}</FieldLegend>
							<ToggleGroup
								variant="outline"
								value={[String(soreness)]}
								onValueChange={(vals) => {
									const v = vals[0];
									if (v) setSoreness(Number(v));
								}}
							>
								{SCALE.map((n) => (
									<ToggleGroupItem key={n} value={String(n)}>
										{n}
									</ToggleGroupItem>
								))}
							</ToggleGroup>
						</FieldSet>

						<FieldSet>
							<FieldLegend variant="label">{t("checkin.minutes")}</FieldLegend>
							<ToggleGroup
								variant="outline"
								value={[String(minutesAvailable)]}
								onValueChange={(vals) => {
									const v = vals[0];
									if (v) setMinutesAvailable(Number(v));
								}}
							>
								{SESSION_MINUTES.map((m) => (
									<ToggleGroupItem key={m} value={String(m)}>
										{t("onboarding.schedule.minutes", { n: m })}
									</ToggleGroupItem>
								))}
							</ToggleGroup>
						</FieldSet>

						<FieldSet>
							<FieldLegend variant="label">
								{t("checkin.painAreas")}
							</FieldLegend>
							<FieldGroup className="grid grid-cols-2 gap-3">
								{INJURIES.map((injury) => {
									const id = `checkin-pain-${injury}`;
									return (
										<FieldLabel key={injury} htmlFor={id}>
											<Field orientation="horizontal">
												<Checkbox
													id={id}
													checked={painAreas.includes(injury)}
													onCheckedChange={() =>
														setPainAreas((prev) => toggleItem(prev, injury))
													}
												/>
												<FieldTitle>
													{t(`onboarding.body.injuryOptions.${injury}`)}
												</FieldTitle>
											</Field>
										</FieldLabel>
									);
								})}
							</FieldGroup>
						</FieldSet>
					</FieldGroup>
				</div>

				<SheetFooter>
					<Button className="w-full" disabled={pending} onClick={handleSubmit}>
						{pending && <Loader2 className="animate-spin" />}
						{pending ? t("checkin.submitting") : t("checkin.submit")}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
