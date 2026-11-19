import "server-only";
import { APIError, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { isEmailAllowed, parseAllowlist } from "./allowlist";

const allowlist = parseAllowlist(env.ALLOWED_EMAILS);

export const auth = betterAuth({
	baseURL: env.BETTER_AUTH_URL,
	secret: env.BETTER_AUTH_SECRET,
	database: prismaAdapter(db, { provider: "postgresql" }),
	emailAndPassword: { enabled: false },
	socialProviders: {
		google: {
			clientId: env.BETTER_AUTH_GOOGLE_CLIENT_ID,
			clientSecret: env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
			prompt: "select_account",
		},
	},
	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					if (!isEmailAllowed(user.email, allowlist)) {
						throw new APIError("FORBIDDEN", {
							message: "This account is not allowed to sign in.",
						});
					}
					return { data: user };
				},
			},
		},
	},
	plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
