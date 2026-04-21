import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL?.trim() || "http://localhost:3000";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.trim();
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET?.trim();

const trustedOrigins = Array.from(
  new Set(
    [BETTER_AUTH_URL, process.env.BETTER_AUTH_TRUSTED_ORIGINS]
      .flatMap((value) => (value ? value.split(",") : []))
      .map((origin) => origin.trim())
      .filter(Boolean),
  ),
);

export const auth = betterAuth({
  baseURL: BETTER_AUTH_URL,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  ...(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
    ? {
        socialProviders: {
          google: {
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
          },
        },
      }
    : {}),
});