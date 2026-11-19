import { z } from "zod";

export const EXPERIENCE_LEVELS = [
	"NONE",
	"BEGINNER",
	"INTERMEDIATE",
	"ADVANCED",
] as const;
export const GOALS = [
	"strength",
	"muscle",
	"fat_loss",
	"skills",
	"mobility",
	"endurance",
] as const;
export const EQUIPMENT = [
	"none",
	"pullup_bar",
	"dip_bars",
	"rings",
	"parallettes",
	"resistance_band",
] as const;
export const INJURIES = [
	"shoulder",
	"wrist",
	"elbow",
	"lower_back",
	"knee",
	"other",
] as const;
export const SESSION_MINUTES = [15, 30, 45, 60] as const;

export const ExperienceStep = z.object({
	experienceLevel: z.enum(EXPERIENCE_LEVELS),
	maxPushups: z.number().int().min(0).max(200).optional(),
	maxPullups: z.number().int().min(0).max(100).optional(),
	plankSeconds: z.number().int().min(0).max(1800).optional(),
});

export const GoalsStep = z.object({
	goals: z.array(z.enum(GOALS)).min(1),
});

export const EquipmentStep = z.object({
	equipment: z.array(z.enum(EQUIPMENT)).min(1),
});

export const ScheduleStep = z.object({
	trainingDays: z
		.array(z.number().int().min(0).max(6))
		.min(2)
		.max(6)
		.refine((d) => new Set(d).size === d.length, "Duplicate days"),
	sessionMinutes: z.union(SESSION_MINUTES.map((m) => z.literal(m))),
});

export const BodyStep = z.object({
	heightCm: z.number().min(100).max(250),
	weightKg: z.number().min(25).max(300),
	birthYear: z
		.number()
		.int()
		.min(1920)
		.max(new Date().getFullYear() - 10)
		.optional(),
	sex: z.enum(["male", "female", "prefer_not"]).optional(),
	injuries: z.array(z.enum(INJURIES)).default([]),
	injuryNotes: z.string().max(500).optional(),
});

export const DisclaimerStep = z.object({
	disclaimerAccepted: z.literal(true),
});

export const OnboardingSchema = ExperienceStep.extend(GoalsStep.shape)
	.extend(EquipmentStep.shape)
	.extend(ScheduleStep.shape)
	.extend(BodyStep.shape)
	.extend(DisclaimerStep.shape);

export type OnboardingInput = z.input<typeof OnboardingSchema>;
export type OnboardingData = z.output<typeof OnboardingSchema>;
