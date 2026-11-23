"use client";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/reui/badge";
import { DatePicker } from "@/components/reui/date-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldContent,
	FieldGroup,
	FieldLabel,
	FieldTitle,
} from "@/components/ui/field";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
	deleteMenstrualCycleAction,
	upsertMenstrualCycleAction,
} from "@/server/actions/wellness";
import type { MenstrualCycleView } from "@/server/services/wellness-service";

export type WellnessCategoryKey =
	| "period"
	| "pain"
	| "supplements"
	| "medications"
	| "sleep"
	| "readiness";

export const ALL_WELLNESS_CATEGORIES: readonly WellnessCategoryKey[] = [
	"period",
	"pain",
	"supplements",
	"medications",
	"sleep",
	"readiness",
];

export type LearnMoreTopic =
	| "period"
	| "pain"
	| "supplements"
	| "medications"
	| "sleep";

export function CategoryFilterSheet({
	open,
	onOpenChange,
	tracksPeriod,
	visibleCategories,
	onToggleCategory,
	onResetAll,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	tracksPeriod: boolean;
	visibleCategories: readonly WellnessCategoryKey[];
	onToggleCategory: (category: WellnessCategoryKey) => void;
	onResetAll: () => void;
}) {
	const t = useTranslations("calendar");
	const options = tracksPeriod
		? ALL_WELLNESS_CATEGORIES
		: ALL_WELLNESS_CATEGORIES.filter((c) => c !== "period");

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				className="mx-auto max-h-[80dvh] max-w-md overflow-y-auto"
			>
				<SheetHeader>
					<SheetTitle>{t("filterSheetTitle")}</SheetTitle>
					<SheetDescription>{t("filterSheetDescription")}</SheetDescription>
				</SheetHeader>
				<div className="space-y-4 px-6 pb-6">
					<FieldGroup className="gap-3">
						{options.map((cat) => {
							const id = `filter-cat-${cat}`;
							const checked = visibleCategories.includes(cat);
							return (
								<FieldLabel key={cat} htmlFor={id}>
									<Field orientation="horizontal">
										<Checkbox
											id={id}
											checked={checked}
											onCheckedChange={() => onToggleCategory(cat)}
										/>
										<FieldContent>
											<FieldTitle>
												{t(`filterCategoryLabels.${cat}`)}
											</FieldTitle>
										</FieldContent>
									</Field>
								</FieldLabel>
							);
						})}
					</FieldGroup>
					<Button
						type="button"
						variant="outline"
						className="w-full"
						onClick={onResetAll}
					>
						{t("filterResetButton")}
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}

export function LearnMoreSheet({
	topic,
	onClose,
}: {
	topic: LearnMoreTopic | null;
	onClose: () => void;
}) {
	const t = useTranslations("calendar");

	return (
		<Sheet
			open={topic !== null}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<SheetContent
				side="bottom"
				className="mx-auto max-h-[75dvh] max-w-md overflow-y-auto"
			>
				{topic && (
					<>
						<SheetHeader>
							<SheetTitle>{t(`learnMore.${topic}.title`)}</SheetTitle>
							<SheetDescription>
								{t(`learnMore.${topic}.summary`)}
							</SheetDescription>
						</SheetHeader>
						<div className="space-y-3 px-6 pb-6 text-sm text-muted-foreground">
							<p>{t(`learnMore.${topic}.guidance`)}</p>
							<p className="text-xs">{t("learnMore.disclaimer")}</p>
						</div>
					</>
				)}
			</SheetContent>
		</Sheet>
	);
}

export function CycleHistorySheet({
	open,
	onOpenChange,
	cycles,
	selectedDateKey,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	cycles: MenstrualCycleView[];
	selectedDateKey: string;
}) {
	const t = useTranslations("calendar");
	const tCommon = useTranslations("common");
	const router = useRouter();
	const [editingId, setEditingId] = useState<string | undefined>(undefined);
	const [startDate, setStartDate] = useState(selectedDateKey);
	const [endDate, setEndDate] = useState("");
	const [notes, setNotes] = useState("");
	const [pending, startTransition] = useTransition();

	function resetForm() {
		setEditingId(undefined);
		setStartDate(selectedDateKey);
		setEndDate("");
		setNotes("");
	}

	function handleEditRow(cycle: MenstrualCycleView) {
		setEditingId(cycle.id);
		setStartDate(cycle.startDate);
		setEndDate(cycle.endDate ?? "");
		setNotes(cycle.notes ?? "");
	}

	function handleSaveCycle() {
		startTransition(async () => {
			const res = await upsertMenstrualCycleAction({
				id: editingId,
				startDate,
				endDate: endDate.trim() || null,
				notes: notes.trim() || null,
			});
			if (res.ok) {
				toast.success(t("cycleHistorySaved"));
				resetForm();
				router.refresh();
			} else {
				toast.error(t("cycleHistoryError"));
			}
		});
	}

	function handleDeleteCycle(cycleId: string) {
		startTransition(async () => {
			const res = await deleteMenstrualCycleAction(cycleId);
			if (res.ok) {
				toast.success(t("cycleHistoryDeleted"));
				if (editingId === cycleId) resetForm();
				router.refresh();
			} else {
				toast.error(t("cycleHistoryError"));
			}
		});
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				className="mx-auto max-h-[85dvh] max-w-md overflow-y-auto"
			>
				<SheetHeader>
					<SheetTitle>{t("cycleHistoryTitle")}</SheetTitle>
					<SheetDescription>{t("cycleHistoryDescription")}</SheetDescription>
				</SheetHeader>

				<div className="space-y-4 px-6 pb-6">
					<div className="space-y-3 rounded-xl border bg-muted/30 p-3">
						<div className="text-xs font-medium text-muted-foreground">
							{editingId
								? t("cycleHistoryEditFormTitle")
								: t("cycleHistoryAddFormTitle")}
						</div>
						<div className="grid grid-cols-2 gap-2">
							<Field>
								<FieldLabel htmlFor="cycle-hist-start">
									{t("cycleHistoryStartLabel")}
								</FieldLabel>
								<DatePicker
									id="cycle-hist-start"
									value={startDate || null}
									onChange={(val) => setStartDate(val ?? selectedDateKey)}
									placeholder={tCommon("pickDate")}
									clearLabel={tCommon("clearDate")}
									maxDate={new Date()}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="cycle-hist-end">
									{t("cycleHistoryEndLabel")}
								</FieldLabel>
								<DatePicker
									id="cycle-hist-end"
									value={endDate || null}
									onChange={(val) => setEndDate(val ?? "")}
									placeholder={tCommon("pickDate")}
									clearLabel={tCommon("clearDate")}
									clearable
									maxDate={new Date()}
								/>
							</Field>
						</div>
						<Field>
							<FieldLabel htmlFor="cycle-hist-notes">
								{t("cycleHistoryNotesLabel")}
							</FieldLabel>
							<Textarea
								id="cycle-hist-notes"
								maxLength={300}
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder={t("cycleHistoryNotesPlaceholder")}
							/>
						</Field>
						<div className="flex gap-2">
							<Button
								type="button"
								className="flex-1"
								disabled={pending || !startDate}
								onClick={handleSaveCycle}
							>
								{pending ? <Loader2 className="animate-spin" /> : <Plus />}
								{editingId
									? t("cycleHistoryUpdateButton")
									: t("cycleHistorySaveButton")}
							</Button>
							{editingId && (
								<Button
									type="button"
									variant="ghost"
									onClick={resetForm}
									disabled={pending}
								>
									{t("cycleHistoryCancelEdit")}
								</Button>
							)}
						</div>
					</div>

					<div className="space-y-2">
						{cycles.length === 0 ? (
							<p className="text-center text-sm text-muted-foreground py-4">
								{t("cycleHistoryEmpty")}
							</p>
						) : (
							cycles.map((cycle) => (
								<div
									key={cycle.id}
									className="flex items-center justify-between gap-2 rounded-xl border p-3"
								>
									<div className="min-w-0 space-y-1">
										<div className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
											<span>
												{cycle.startDate}
												{cycle.endDate ? ` → ${cycle.endDate}` : ""}
											</span>
											{cycle.periodLengthDays && (
												<Badge variant="destructive-light" size="xs">
													{t("cycleHistoryPeriodLen", {
														days: cycle.periodLengthDays,
													})}
												</Badge>
											)}
											{cycle.cycleLengthDays && (
												<Badge variant="secondary" size="xs">
													{t("cycleHistoryCycleLen", {
														days: cycle.cycleLengthDays,
													})}
												</Badge>
											)}
										</div>
										{cycle.notes && (
											<p className="text-xs text-muted-foreground">
												{cycle.notes}
											</p>
										)}
									</div>
									<div className="flex shrink-0 items-center gap-1">
										<Button
											type="button"
											size="xs"
											variant="ghost"
											onClick={() => handleEditRow(cycle)}
										>
											{t("cycleHistoryEditBtn")}
										</Button>
										<Button
											type="button"
											size="icon-xs"
											variant="ghost"
											disabled={pending}
											aria-label={t("cycleHistoryDeleteAria")}
											onClick={() => handleDeleteCycle(cycle.id)}
										>
											<Trash2 className="text-destructive" />
										</Button>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
