"use client";
import { Loader2, Ruler } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/reui/badge";
import {
	Frame,
	FrameDescription,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@/components/reui/frame";
import {
	NumberField,
	NumberFieldDecrement,
	NumberFieldGroup,
	NumberFieldIncrement,
	NumberFieldInput,
	NumberFieldScrubArea,
} from "@/components/reui/number-field";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logMeasurementAction } from "@/server/actions/body";
import type { BodyMeasurementsSummary } from "./types";

type MeasurementKey = keyof BodyMeasurementsSummary;

const MEASUREMENT_KEYS: readonly MeasurementKey[] = ["WAIST", "CHEST", "ARM"];

const DEFAULT_MEASUREMENT_CM: Record<MeasurementKey, number> = {
	WAIST: 80,
	CHEST: 95,
	ARM: 32,
};

export function MeasurementsCard({
	measurements,
}: {
	measurements: BodyMeasurementsSummary;
}) {
	const t = useTranslations();
	const [activeType, setActiveType] = useState<MeasurementKey>("WAIST");
	const [valueCm, setValueCm] = useState<number>(
		measurements.WAIST ?? DEFAULT_MEASUREMENT_CM.WAIST,
	);
	const [pending, startTransition] = useTransition();

	function handleTypeChange(next: string) {
		if (next !== "WAIST" && next !== "CHEST" && next !== "ARM") return;
		setActiveType(next);
		setValueCm(measurements[next] ?? DEFAULT_MEASUREMENT_CM[next]);
	}

	function handleSave() {
		startTransition(async () => {
			const res = await logMeasurementAction({
				type: activeType,
				valueCm,
			});
			if (res.ok) {
				toast.success(t("body.measurementSaved"));
			} else {
				toast.error(t("common.error"));
			}
		});
	}

	return (
		<Frame spacing="sm">
			<FrameHeader>
				<FrameTitle>{t("body.measurementsTitle")}</FrameTitle>
				<FrameDescription>{t("body.measurementsDescription")}</FrameDescription>
			</FrameHeader>
			<FramePanel className="flex flex-col gap-3">
				<div className="flex flex-wrap gap-1.5">
					{MEASUREMENT_KEYS.map((key) => {
						const latest = measurements[key];
						return (
							<Badge
								key={key}
								variant={latest !== null ? "secondary" : "outline"}
								size="sm"
							>
								{t(`body.measurementTypeLabels.${key}`)}:{" "}
								{latest !== null
									? t("body.cmUnit", { val: latest.toFixed(1) })
									: t("body.measurementEmpty")}
							</Badge>
						);
					})}
				</div>

				<Tabs value={activeType} onValueChange={handleTypeChange}>
					<TabsList>
						{MEASUREMENT_KEYS.map((key) => (
							<TabsTrigger key={key} value={key}>
								{t(`body.measurementTypeLabels.${key}`)}
							</TabsTrigger>
						))}
					</TabsList>

					{MEASUREMENT_KEYS.map((key) => (
						<TabsContent key={key} value={key}>
							<div className="flex items-end gap-3">
								<NumberField
									className="flex-1"
									min={15}
									max={250}
									step={0.5}
									value={valueCm}
									onValueChange={(val) => {
										if (typeof val === "number") setValueCm(val);
									}}
								>
									<NumberFieldScrubArea
										label={t("body.measurementInputLabel", {
											label: t(`body.measurementTypeLabels.${key}`),
										})}
									/>
									<NumberFieldGroup>
										<NumberFieldDecrement />
										<NumberFieldInput />
										<NumberFieldIncrement />
									</NumberFieldGroup>
								</NumberField>

								<Button disabled={pending} onClick={handleSave}>
									{pending ? <Loader2 className="animate-spin" /> : <Ruler />}
									{pending
										? t("body.measurementSaving")
										: t("body.measurementSave")}
								</Button>
							</div>
						</TabsContent>
					))}
				</Tabs>
			</FramePanel>
		</Frame>
	);
}
