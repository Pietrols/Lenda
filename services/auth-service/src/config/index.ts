// ─────────────────────────────────────────────────────────────────────────────
// All environment variables are read and validated HERE, once, at startup.
// If a required variable is missing the service crashes immediately with a
// clear error — not mysteriously later when the first user tries to log in.
// ─────────────────────────────────────────────────────────────────────────────

import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3001),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 chars"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  OTP_EXPIRES_MINUTES: z.coerce.number().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),

  SENDGRID_API_KEY: z.string().default(""),
  EMAIL_FROM: z.string().default("noreply@lenda.app"),

  CORS_ORIGINS: z.string().default("http://localhost:5173"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("  Invalid environment variables:");
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = result.data;

export const isDev = config.NODE_ENV === "development";
export const isProd = config.NODE_ENV === "production";
