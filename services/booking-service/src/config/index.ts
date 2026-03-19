import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  BOOKING_PORT: z.coerce.number().default(3002),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 chars"),
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
