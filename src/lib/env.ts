import "server-only";
import { z } from "zod";

const EnvSchema = z.object({
	DATABASE_URL: z.string().min(1),
	BETTER_AUTH_SECRET: z.string().min(32),
	BETTER_AUTH_URL: z.url(),
	BETTER_AUTH_GOOGLE_CLIENT_ID: z.string().min(1),
	BETTER_AUTH_GOOGLE_CLIENT_SECRET: z.string().min(1),
	GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
	ALLOWED_EMAILS: z.string().optional().default(""),
});

export const env = EnvSchema.parse(process.env);
