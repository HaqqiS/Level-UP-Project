import type { WeightEntryPoint } from "@/lib/body/metrics";

export type BodyTrackingViewProps = {
	todayKey: string;
	latestHeightCm: number | null;
	entries: WeightEntryPoint[];
};
