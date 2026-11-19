"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/reui/badge";
import {
	Stepper,
	StepperContent,
	StepperIndicator,
	StepperItem,
	StepperNav,
	StepperPanel,
	StepperTrigger,
} from "@/components/reui/stepper";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	BodyStep,
	DisclaimerStep,
	EquipmentStep,
	ExperienceStep,
	GoalsStep,
	type OnboardingInput,
	ScheduleStep,
} from "@/lib/validation/onboarding";
import { completeOnboarding } from "@/server/actions/onboarding";
import { BodyStep as BodyStepView } from "./steps/body-step";
import { DisclaimerStep as DisclaimerStepView } from "./steps/disclaimer-step";
import { EquipmentStep as EquipmentStepView } from "./steps/equipment-step";
import { ExperienceStep as ExperienceStepView } from "./steps/experience-step";
import { GoalsStep as GoalsStepView } from "./steps/goals-step";
import { ScheduleStep as ScheduleStepView } from "./steps/schedule-step";
import { useOnboardingStore } from "./store";

const STEPS = [
	{
		schema: ExperienceStep,
		titleKey: "onboarding.experience.title",
		subtitleKey: "onboarding.experience.subtitle",
		Component: ExperienceStepView,
	},
	{
		schema: GoalsStep,
		titleKey: "onboarding.goals.title",
		subtitleKey: "onboarding.goals.subtitle",
		Component: GoalsStepView,
	},
	{
		schema: EquipmentStep,
		titleKey: "onboarding.equipment.title",
		subtitleKey: "onboarding.equipment.subtitle",
		Component: EquipmentStepView,
	},
	{
		schema: ScheduleStep,
		titleKey: "onboarding.schedule.title",
		subtitleKey: "onboarding.schedule.subtitle",
		Component: ScheduleStepView,
	},
	{
		schema: BodyStep,
		titleKey: "onboarding.body.title",
		subtitleKey: "onboarding.body.subtitle",
		Component: BodyStepView,
	},
	{
		schema: DisclaimerStep,
		titleKey: "disclaimer.title",
		subtitleKey: null,
		Component: DisclaimerStepView,
	},
] as const;

const TOTAL = STEPS.length;

export function OnboardingWizard() {
	const t = useTranslations();
	const { step, draft, setStep, update, reset } = useOnboardingStore();
	const [pending, startTransition] = useTransition();
	const [direction, setDirection] = useState(1);

	const active = STEPS[step];
	const valid = active.schema.safeParse(draft).success;
	const isLast = step === TOTAL - 1;

	function go(delta: number) {
		setDirection(delta);
		setStep(Math.min(Math.max(step + delta, 0), TOTAL - 1));
	}

	function submit() {
		startTransition(async () => {
			const res = await completeOnboarding(draft as OnboardingInput);
			// completeOnboarding redirects on success; reaching here means failure.
			if (res && !res.ok) toast.error(t("common.error"));
			else reset();
		});
	}

	const StepComponent = active.Component;

	return (
		<div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 p-4">
			<Stepper
				value={step + 1}
				onValueChange={(nextStep) => {
					if (nextStep - 1 < step && !pending) {
						setDirection(-1);
						setStep(nextStep - 1);
					}
				}}
				className="flex flex-col gap-3"
			>
				<div className="flex items-center justify-between gap-3">
					<Button
						variant="ghost"
						size="icon"
						aria-label={t("common.back")}
						onClick={() => go(-1)}
						disabled={step === 0 || pending}
					>
						<ChevronLeft />
					</Button>
					<Badge variant="secondary">
						{t("onboarding.stepOf", { current: step + 1, total: TOTAL })}
					</Badge>
				</div>

				<StepperNav className="gap-1.5">
					{STEPS.map((_, index) => (
						<StepperItem
							key={STEPS[index].titleKey}
							step={index + 1}
							disabled={index > step || pending}
							className="flex-1 overflow-hidden first:rounded-s-full last:rounded-e-full"
						>
							<StepperTrigger className="w-full">
								<StepperIndicator className="h-2 w-full rounded-none! bg-border data-[state=active]:bg-primary data-[state=completed]:bg-primary">
									<span className="sr-only">{index + 1}</span>
								</StepperIndicator>
							</StepperTrigger>
						</StepperItem>
					))}
				</StepperNav>

				<div className="overflow-hidden">
					<AnimatePresence mode="wait" custom={direction} initial={false}>
						<motion.div
							key={step}
							custom={direction}
							initial={{ x: direction * 40, opacity: 0 }}
							animate={{ x: 0, opacity: 1 }}
							exit={{ x: direction * -40, opacity: 0 }}
							transition={{ duration: 0.2 }}
						>
							<Card>
								<CardHeader>
									<CardTitle>{t(active.titleKey)}</CardTitle>
									{active.subtitleKey && (
										<CardDescription>{t(active.subtitleKey)}</CardDescription>
									)}
								</CardHeader>
								<CardContent>
									<StepperPanel>
										<StepperContent value={step + 1}>
											<StepComponent draft={draft} update={update} />
										</StepperContent>
									</StepperPanel>
								</CardContent>
								<CardFooter>
									<Button
										className="w-full"
										disabled={!valid || pending}
										onClick={isLast ? submit : () => go(1)}
									>
										{pending && <Loader2 className="animate-spin" />}
										{pending
											? t("common.saving")
											: isLast
												? t("common.finish")
												: t("common.next")}
									</Button>
								</CardFooter>
							</Card>
						</motion.div>
					</AnimatePresence>
				</div>
			</Stepper>
		</div>
	);
}
