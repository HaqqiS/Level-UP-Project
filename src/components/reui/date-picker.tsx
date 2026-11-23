"use client";

import { cn } from "cn";
import { format, isValid } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export type DatePickerProps = {
	id?: string;
	value?: string | null;
	onChange: (next: string | null) => void;
	placeholder?: string;
	clearLabel?: string;
	disabled?: boolean;
	clearable?: boolean;
	maxDate?: Date;
	className?: string;
};

/** Parse a `YYYY-MM-DD` date key as local midnight without UTC day shift. */
function parseLocalDateKey(value?: string | null): Date | undefined {
	if (!value) return undefined;
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return undefined;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const parsed = new Date(year, month - 1, day);
	if (
		!isValid(parsed) ||
		parsed.getFullYear() !== year ||
		parsed.getMonth() !== month - 1 ||
		parsed.getDate() !== day
	) {
		return undefined;
	}
	return parsed;
}

export function DatePicker({
	id,
	value,
	onChange,
	placeholder = "Pick a date",
	clearLabel = "Clear",
	disabled = false,
	clearable = false,
	maxDate,
	className,
}: DatePickerProps) {
	const [open, setOpen] = useState(false);
	const selectedDate = parseLocalDateKey(value);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				disabled={disabled}
				render={
					<Button
						id={id}
						type="button"
						variant="outline"
						disabled={disabled}
						className={cn(
							"w-full justify-between font-normal",
							!selectedDate && "text-muted-foreground",
							className,
						)}
					/>
				}
			>
				<span className="truncate">
					{selectedDate ? format(selectedDate, "PP") : placeholder}
				</span>
				<CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
			</PopoverTrigger>
			<PopoverContent align="start" className="w-auto gap-0 p-0">
				<Calendar
					mode="single"
					captionLayout="dropdown"
					selected={selectedDate}
					defaultMonth={selectedDate ?? new Date()}
					disabled={maxDate ? { after: maxDate } : undefined}
					onSelect={(day) => {
						onChange(day ? format(day, "yyyy-MM-dd") : null);
						setOpen(false);
					}}
				/>
				{clearable && value && (
					<div className="flex justify-end border-t p-2">
						<Button
							type="button"
							variant="ghost"
							size="xs"
							onClick={() => {
								onChange(null);
								setOpen(false);
							}}
						>
							<X className="size-3.5" />
							{clearLabel}
						</Button>
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
