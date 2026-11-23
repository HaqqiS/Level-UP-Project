"use client";

import { cn } from "cn";
import { useEffect, useRef, useState } from "react";

export function MeasuredChartBox({
	active,
	className,
	children,
}: {
	active: boolean;
	className?: string;
	children: React.ReactNode;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [isMeasured, setIsMeasured] = useState(false);

	useEffect(() => {
		const el = containerRef.current;
		if (!active || !el) {
			setIsMeasured(false);
			return;
		}

		const updateMeasurement = () => {
			const next = el.clientWidth > 0 && el.clientHeight > 0;
			setIsMeasured((prev) => (prev === next ? prev : next));
		};

		updateMeasurement();

		if (typeof ResizeObserver === "undefined") {
			return;
		}

		const observer = new ResizeObserver(updateMeasurement);
		observer.observe(el);

		return () => observer.disconnect();
	}, [active]);

	return (
		<div ref={containerRef} className={cn("min-h-[200px] w-full", className)}>
			{isMeasured ? (
				children
			) : (
				<div aria-hidden="true" className="aspect-video min-h-[200px] w-full" />
			)}
		</div>
	);
}
