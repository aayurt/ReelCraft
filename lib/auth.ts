import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL!;

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    // Simple reset flow hook for development/testing; avoids hard requirements for email sending
    sendResetPassword: async ({ user, url, token }, request) => {
      // In a real deployment you would integrate with your email provider here.
      // For local testing, just log to console so testers can observe the flow.
      // eslint-disable-next-line no-console
      console.log(
        `Password reset requested for ${user?.email}. Reset URL: ${url} Token: ${token}`
      );
    },
  },
  trustedOrigins: [process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"],
  plugins: [nextCookies()],
  secret: process.env.BETTER_SECRET!,
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
});
