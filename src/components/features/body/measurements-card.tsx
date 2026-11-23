"use client";
import { Loader2, Ruler, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/reui/badge";
import {
	NumberField,
	NumberFieldDecrement,
	NumberFieldGroup,
	NumberFieldIncrement,
	NumberFieldInput,
	NumberFieldScrubArea,
} from "@/components/reui/number-field";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemMedia,
	ItemTitle,
} from "@/components/ui/item";
import {
	groupMeasurementEntries,
	MEASUREMENT_TYPES,
	type MeasurementEntryPoint,
	type MeasurementType,
} from "@/lib/body/metrics";
import {
	deleteMeasurementEntriesAction,
	logMeasurementsBatchAction,
} from "@/server/actions/body";
import type { BodyMeasurementsSummary } from "./types";
import { MetricHistoryCollapsible } from "./weight-history-list";

const DEFAULT_MEASUREMENT_CM: Record<MeasurementType, number> = {
	WAIST: 80,
	CHEST: 95,
	ARM: 32,
};

export function MeasurementsCard({
	measurements,
	entries,
}: {
	measurements: BodyMeasurementsSummary;
	entries: readonly MeasurementEntryPoint[];
}) {
	const t = useTranslations();
	const [values, setValues] = useState<Record<MeasurementType, number | null>>({
		WAIST: measurements.WAIST,
		CHEST: measurements.CHEST,
		ARM: measurements.ARM,
	});
	const [pending, startTransition] = useTransition();
	const [deletingKey, setDeletingKey] = useState<string | null>(null);

	const hasAnyValue = MEASUREMENT_TYPES.some((key) => values[key] !== null);
	const historyGroups = useMemo(
		() => groupMeasurementEntries(entries).slice(0, 10),
		[entries],
	);

	function handleSave() {
		if (!hasAnyValue) return;
		startTransition(async () => {
			const res = await logMeasurementsBatchAction({
				waistCm: values.WAIST,
				chestCm: values.CHEST,
				armCm: values.ARM,
			});
			if (res.ok) {
				toast.success(t("body.measurementSaved"));
			} else {
				toast.error(t("common.error"));
			}
		});
	}

	async function handleDeleteGroup(groupKey: string, metricIds: string[]) {
		setDeletingKey(groupKey);
		try {
			const res = await deleteMeasurementEntriesAction(metricIds);
			if (res.ok) {
				toast.success(t("body.deleteMeasurementSuccess"));
			} else {
				toast.error(t("common.error"));
			}
		} finally {
			setDeletingKey(null);
		}
	}

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle>{t("body.measurementsTitle")}</CardTitle>
				<CardDescription>{t("body.measurementsDescription")}</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				<div className="flex flex-wrap gap-1.5">
					{MEASUREMENT_TYPES.map((key) => {
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

				<div className="space-y-2">
					{MEASUREMENT_TYPES.map((key) => (
						<NumberField
							key={key}
							className="flex-row items-center justify-between gap-3 rounded-2xl bg-muted/50 px-3 py-2"
							min={15}
							max={250}
							step={0.5}
							value={values[key]}
							onValueChange={(val) =>
								setValues((prev) => ({ ...prev, [key]: val }))
							}
						>
							<NumberFieldScrubArea
								label={t("body.measurementInputLabel", {
									label: t(`body.measurementTypeLabels.${key}`),
								})}
								className="shrink-0"
							/>
							<NumberFieldGroup className="w-36 shrink-0 bg-card/80 dark:bg-input/30">
								<NumberFieldDecrement />
								<NumberFieldInput
									placeholder={String(DEFAULT_MEASUREMENT_CM[key])}
								/>
								<NumberFieldIncrement />
							</NumberFieldGroup>
						</NumberField>
					))}
				</div>

				<Button
					className="w-full"
					disabled={pending || !hasAnyValue}
					onClick={handleSave}
				>
					{pending ? <Loader2 className="animate-spin" /> : <Ruler />}
					{pending ? t("body.measurementSaving") : t("body.measurementSave")}
				</Button>

				{historyGroups.length > 0 && (
					<MetricHistoryCollapsible
						title={t("body.measurementHistoryTitle")}
						count={historyGroups.length}
					>
						{historyGroups.map((group) => {
							const presentTypes = MEASUREMENT_TYPES.filter(
								(type) => group.values[type] !== undefined,
							);
							const isDeleting = deletingKey === group.key;

							return (
								<Item
									key={group.key}
									variant="muted"
									size="xs"
									className="flex-nowrap bg-muted/50"
								>
									<ItemMedia
										variant="icon"
										className="size-6 group-has-data-[slot=item-description]/item:translate-y-0 group-has-data-[slot=item-description]/item:self-center"
									>
										<Ruler />
									</ItemMedia>
									<ItemContent className="min-w-0">
										<ItemTitle className="line-clamp-none flex-wrap gap-x-2 gap-y-0.5">
											{presentTypes.map((type, idx) => (
												<span
													key={type}
													className="inline-flex items-center gap-2"
												>
													{idx > 0 && (
														<span
															aria-hidden="true"
															className="text-muted-foreground"
														>
															·
														</span>
													)}
													<span>
														{t(`body.measurementTypeLabels.${type}`)}{" "}
														<span className="tabular-nums">
															{t("body.cmUnit", {
																val: (group.values[type] as number).toFixed(1),
															})}
														</span>
													</span>
												</span>
											))}
										</ItemTitle>
										<ItemDescription>{group.dateKey}</ItemDescription>
									</ItemContent>
									<ItemActions className="shrink-0">
										<Button
											variant="ghost"
											size="icon-xs"
											aria-label={t("body.deleteMeasurementAria")}
											disabled={isDeleting || deletingKey !== null}
											onClick={() =>
												void handleDeleteGroup(group.key, group.metricIds)
											}
										>
											{isDeleting ? (
												<Loader2 className="animate-spin" />
											) : (
												<Trash2 />
											)}
										</Button>
									</ItemActions>
								</Item>
							);
						})}
					</MetricHistoryCollapsible>
				)}
			</CardContent>
		</Card>
	);
}
