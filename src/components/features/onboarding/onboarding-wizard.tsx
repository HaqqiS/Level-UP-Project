"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/reui/badge";
import {
	Stepper,
	StepperContent,
	StepperIndicator,
	StepperItem,
	StepperNav,
	StepperPanel,
	StepperSeparator,
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

export function OnboardingWizard({
	initialDraft,
}: {
	initialDraft?: Partial<OnboardingInput>;
} = {}) {
	const t = useTranslations();
	const router = useRouter();
	const { step, draft, setStep, update, hydrate, reset } = useOnboardingStore();
	const [pending, startTransition] = useTransition();
	const [direction, setDirection] = useState(1);
	const hydratedRef = useRef(false);
	const isRedo = Boolean(initialDraft);

	useEffect(() => {
		if (!hydratedRef.current && initialDraft) {
			hydratedRef.current = true;
			hydrate(initialDraft);
		}
	}, [hydrate, initialDraft]);

	const active = STEPS[step];
	const valid = active.schema.safeParse(draft).success;
	const isLast = step === TOTAL - 1;

	function go(delta: number) {
		setDirection(delta);
		setStep(Math.min(Math.max(step + delta, 0), TOTAL - 1));
	}

	function handleCancelRedo() {
		reset();
		router.push("/profile");
	}

	function submit() {
		const payload = { ...draft } as OnboardingInput;
		startTransition(async () => {
			try {
				const res = await completeOnboarding(payload);
				// completeOnboarding redirects on success; reaching here means failure.
				if (res && !res.ok) {
					toast.error(t("common.error"));
				} else {
					reset();
				}
			} catch (err) {
				// Next.js redirect() throws NEXT_REDIRECT on success — clear persisted wizard draft.
				reset();
				throw err;
			}
		});
	}

	const StepComponent = active.Component;

	return (
		<div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 overflow-x-clip p-4">
			<Stepper
				value={step + 1}
				onValueChange={(nextStep) => {
					if (nextStep - 1 < step && !pending) {
						setDirection(-1);
						setStep(nextStep - 1);
					}
				}}
				indicators={{ completed: <Check className="size-3.5" /> }}
				className="flex flex-col gap-3"
			>
				<div className="flex items-center justify-between gap-3">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label={t("common.back")}
						onClick={() => (step === 0 && isRedo ? handleCancelRedo() : go(-1))}
						disabled={(step === 0 && !isRedo) || pending}
					>
						<ChevronLeft />
					</Button>
					<div className="flex items-center gap-2">
						<Badge variant="secondary">
							{t("onboarding.stepOf", { current: step + 1, total: TOTAL })}
						</Badge>
						{isRedo && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								disabled={pending}
								onClick={handleCancelRedo}
							>
								{t("common.cancel")}
							</Button>
						)}
					</div>
				</div>

				<StepperNav>
					{STEPS.map((item, index) => (
						<StepperItem
							key={item.titleKey}
							step={index + 1}
							disabled={index > step || pending}
						>
							<StepperTrigger
								aria-label={`${t("onboarding.stepOf", { current: index + 1, total: TOTAL })}: ${t(item.titleKey)}`}
							>
								<StepperIndicator>{index + 1}</StepperIndicator>
							</StepperTrigger>
							{index < STEPS.length - 1 && (
								<StepperSeparator className="group-data-[state=completed]/step:bg-primary" />
							)}
						</StepperItem>
					))}
				</StepperNav>

				<div className="overflow-x-clip">
					<AnimatePresence mode="wait" custom={direction} initial={false}>
						<motion.div
							key={step}
							custom={direction}
							initial={{ x: direction * 40, opacity: 0 }}
							animate={{ x: 0, opacity: 1 }}
							exit={{ x: direction * -40, opacity: 0 }}
							transition={{ duration: 0.2 }}
						>
							<Card size="sm">
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
								<CardFooter className="flex-col items-stretch gap-2">
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
