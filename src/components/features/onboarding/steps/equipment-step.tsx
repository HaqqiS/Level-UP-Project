"use client";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldTitle,
} from "@/components/ui/field";
import { EQUIPMENT } from "@/lib/validation/onboarding";
import { type StepProps, toggleItem } from "./types";

export function EquipmentStep({ draft, update }: StepProps) {
	const t = useTranslations("onboarding.equipment");
	const selected = draft.equipment ?? [];

	return (
		<FieldGroup className="gap-3">
			{EQUIPMENT.map((item) => {
				const id = `equip-${item}`;
				return (
					<FieldLabel key={item} htmlFor={id}>
						<Field orientation="horizontal">
							<Checkbox
								id={id}
								checked={selected.includes(item)}
								onCheckedChange={() =>
									update({ equipment: toggleItem(draft.equipment, item) })
								}
							/>
							<FieldTitle>{t(item)}</FieldTitle>
						</Field>
					</FieldLabel>
				);
			})}
		</FieldGroup>
	);
}
