import { z } from "zod";
import { INJURIES, SESSION_MINUTES } from "@/lib/validation/onboarding";

export const PlannedExerciseAiSchema = z.object({
	exerciseId: z.string().min(1),
	sets: z.number().int().min(1).max(6),
	targetReps: z.number().int().min(1).max(30).nullable().optional(),
	targetSeconds: z.number().int().min(10).max(180).nullable().optional(),
	restSeconds: z.number().int().min(30).max(180).default(60),
});

export const WeeklySessionAiSchema = z.object({
	dayOfWeek: z.number().int().min(0).max(6),
	focus: z.string().trim().min(2).max(80),
	notes: z.string().trim().max(240).optional(),
	exercises: z.array(PlannedExerciseAiSchema).min(1).max(8),
});

export const WeeklyPlanAiSchema = z.object({
	sessions: z.array(WeeklySessionAiSchema).min(1).max(7),
	notes: z.string().trim().max(400),
});

export const DailyCheckinInputSchema = z.object({
	sessionId: z.string().min(1),
	energy: z.number().int().min(1).max(5),
	soreness: z.number().int().min(1).max(5),
	painAreas: z.array(z.enum(INJURIES)).default([]),
	minutesAvailable: z.union(SESSION_MINUTES.map((m) => z.literal(m))),
});

export const AdjustedSessionAiSchema = z.object({
	focus: z.string().trim().min(2).max(80),
	notes: z.string().trim().max(300),
	exercises: z.array(PlannedExerciseAiSchema).min(1).max(8),
});

export type PlannedExerciseAi = z.output<typeof PlannedExerciseAiSchema>;
export type WeeklyPlanAi = z.output<typeof WeeklyPlanAiSchema>;
export type DailyCheckinInput = z.input<typeof DailyCheckinInputSchema>;
export type AdjustedSessionAi = z.output<typeof AdjustedSessionAiSchema>;
