import type {
	MeasurementEntryPoint,
	WeightEntryPoint,
} from "@/lib/body/metrics";

export type BodyMeasurementsSummary = {
	WAIST: number | null;
	CHEST: number | null;
	ARM: number | null;
};

export type BodyTrackingViewProps = {
	todayKey: string;
	latestHeightCm: number | null;
	entries: WeightEntryPoint[];
	measurementEntries: MeasurementEntryPoint[];
	measurements: BodyMeasurementsSummary;
};
