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
  SUPABASE_URL: z.string().min(1, "SUPABASE_URL is required"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  AUTH_URL: z.string().default("http://localhost:3001"),
  R2_ACCOUNT_ID: z.string().min(1, "R2_ACCOUNT_ID is required"),
  R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID is required"),
  R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY is required"),
  R2_LISTING_BUCKET: z.string().default("lenda-listing"),
  R2_LISTING_PUBLIC_URL: z.string().min(1, "R2_LISTING_PUBLIC_URL is required"),
  INTERNAL_API_KEY: z.string().optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment variables:");
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}

if (result.data.NODE_ENV === "production" && !result.data.INTERNAL_API_KEY) {
  console.error("INTERNAL_API_KEY is required in production");
  process.exit(1);
}

export const config = {
  ...result.data,
  INTERNAL_API_KEY: result.data.INTERNAL_API_KEY ?? "dev-internal-key",
};
export const isDev = config.NODE_ENV === "development";
export const isProd = config.NODE_ENV === "production";
