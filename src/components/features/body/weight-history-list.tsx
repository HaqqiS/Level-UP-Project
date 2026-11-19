"use client";
import { Scale, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import {
	Frame,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
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
		<Item variant="outline" size="xs">
			<ItemMedia variant="icon">
				<Scale />
			</ItemMedia>
			<ItemContent>
				<ItemTitle>
					{t("body.kgUnit", { val: entry.valueKg.toFixed(1) })}
				</ItemTitle>
				<ItemDescription>{entry.dateKey}</ItemDescription>
			</ItemContent>
			<ItemActions>
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
		<Frame spacing="sm">
			<FrameHeader>
				<FrameTitle>{t("historyTitle")}</FrameTitle>
			</FrameHeader>
			<FramePanel>
				<ItemGroup>
					{recent.map((entry) => (
						<HistoryRow key={entry.id} entry={entry} canDelete={canDelete} />
					))}
				</ItemGroup>
			</FramePanel>
		</Frame>
	);
}
