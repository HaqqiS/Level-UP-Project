"use client";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldContent,
	FieldGroup,
	FieldLabel,
	FieldTitle,
} from "@/components/ui/field";
import { GOALS } from "@/lib/validation/onboarding";
import { type StepProps, toggleItem } from "./types";

export function GoalsStep({ draft, update }: StepProps) {
	const t = useTranslations("onboarding.goals");
	const selected = draft.goals ?? [];

	return (
		<FieldGroup className="grid grid-cols-2 gap-3">
			{GOALS.map((goal) => {
				const id = `goal-${goal}`;
				return (
					<FieldLabel key={goal} htmlFor={id}>
						<Field orientation="horizontal">
							<Checkbox
								id={id}
								checked={selected.includes(goal)}
								onCheckedChange={() =>
									update({ goals: toggleItem(draft.goals, goal) })
								}
							/>
							<FieldContent>
								<FieldTitle>{t(goal)}</FieldTitle>
							</FieldContent>
						</Field>
					</FieldLabel>
				);
			})}
		</FieldGroup>
	);
}
