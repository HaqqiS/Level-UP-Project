"use client";
import { cn } from "cn";
import { ChevronDown, History, Scale, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemTitle,
} from "@/components/ui/item";
import type { WeightEntryPoint } from "@/lib/body/metrics";
import { deleteWeightEntryAction } from "@/server/actions/body";

export function MetricHistoryCollapsible({
	title,
	count,
	defaultOpen = false,
	children,
}: {
	title: string;
	count: number;
	defaultOpen?: boolean;
	children: ReactNode;
}) {
	const [open, setOpen] = useState(defaultOpen);

	return (
		<div className="border-t border-border/60 pt-3">
			<Collapsible open={open} onOpenChange={setOpen}>
				<CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-xl px-1 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
					<span className="flex items-center gap-2">
						<History className="size-4 shrink-0" />
						<span>{title}</span>
						<Badge variant="secondary" size="xs" className="tabular-nums">
							{count}
						</Badge>
					</span>
					<ChevronDown
						className={cn(
							"size-4 shrink-0 transition-transform duration-200",
							open && "rotate-180",
						)}
					/>
				</CollapsibleTrigger>
				<CollapsibleContent className="pt-2.5">
					<ItemGroup>{children}</ItemGroup>
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}

function HistoryRow({
	entry,
	canDelete,
}: {
	entry: WeightEntryPoint;
	canDelete: boolean;
}) {
	const t = useTranslations();
	const [pending, startTransition] = useTransition();

	function handleDelete() {
		startTransition(async () => {
			const res = await deleteWeightEntryAction(entry.id);
			if (res.ok) {
				toast.success(t("body.deleteSuccess"));
			} else if (res.reason === "last_entry") {
				toast.info(t("body.deleteLastError"));
			} else {
				toast.error(t("common.error"));
			}
		});
	}

	return (
		<Item variant="muted" size="xs" className="flex-nowrap bg-muted/50">
			<ItemMedia
				variant="icon"
				className="size-6 group-has-data-[slot=item-description]/item:translate-y-0 group-has-data-[slot=item-description]/item:self-center"
			>
				<Scale />
			</ItemMedia>
			<ItemContent className="min-w-0">
				<ItemTitle>
					{t("body.kgUnit", { val: entry.valueKg.toFixed(1) })}
				</ItemTitle>
				<ItemDescription>{entry.dateKey}</ItemDescription>
			</ItemContent>
			<ItemActions className="shrink-0">
				<Button
					variant="ghost"
					size="icon-xs"
					aria-label={t("body.deleteAria")}
					disabled={!canDelete || pending}
					onClick={handleDelete}
				>
					<Trash2 />
				</Button>
			</ItemActions>
		</Item>
	);
}

export function WeightHistoryList({
	entries,
}: {
	entries: readonly WeightEntryPoint[];
}) {
	const t = useTranslations("body");
	const recent = entries.slice(0, 10);
	const canDelete = entries.length > 1;

	if (recent.length === 0) return null;

	return (
		<MetricHistoryCollapsible title={t("historyTitle")} count={recent.length}>
			{recent.map((entry) => (
				<HistoryRow key={entry.id} entry={entry} canDelete={canDelete} />
			))}
		</MetricHistoryCollapsible>
	);
}
