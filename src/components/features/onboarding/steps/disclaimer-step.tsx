"use client";
import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/reui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldContent,
	FieldGroup,
	FieldLabel,
	FieldTitle,
} from "@/components/ui/field";
import type { StepProps } from "./types";

export function DisclaimerStep({ draft, update }: StepProps) {
	const t = useTranslations("disclaimer");

	return (
		<FieldGroup>
			<Alert variant="warning">
				<TriangleAlert />
				<AlertDescription>{t("body")}</AlertDescription>
			</Alert>

			<FieldLabel htmlFor="disclaimer-accept">
				<Field orientation="horizontal">
					<Checkbox
						id="disclaimer-accept"
						checked={draft.disclaimerAccepted === true}
						onCheckedChange={(checked) =>
							update({
								disclaimerAccepted: checked === true ? true : undefined,
							})
						}
					/>
					<FieldContent>
						<FieldTitle>{t("accept")}</FieldTitle>
					</FieldContent>
				</Field>
			</FieldLabel>
		</FieldGroup>
	);
}
