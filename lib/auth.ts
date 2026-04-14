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
  },
  trustedOrigins: [process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"],
  plugins: [nextCookies()],
  secret: process.env.BETTER_SECRET!,
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
});