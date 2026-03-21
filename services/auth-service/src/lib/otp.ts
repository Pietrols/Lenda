import { redis, redisKeys } from "./redis";
import { config } from "../config";
import { AppError } from "./AppError";

interface OtpRecord {
  code: string;
  attempts: number;
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createOtp(key: string): Promise<string> {
  const code = generateCode();
  const record: OtpRecord = { code, attempts: 0 };

  await redis.set(
    key,
    JSON.stringify(record),
    "EX",
    config.OTP_EXPIRES_MINUTES * 60,
  );

  return code;
}

export async function verifyOtp(key: string, inputCode: string): Promise<true> {
  const raw = await redis.get(key);

  if (!raw) {
    throw new AppError(
      "OTP expired or not found. Please request a new one.",
      400,
    );
  }

  const record: OtpRecord = JSON.parse(raw);
  record.attempts += 1;

  if (record.attempts > config.OTP_MAX_ATTEMPTS) {
    await redis.del(key);
    throw new AppError(
      "Too many incorrect attempts. Please request a new OTP.",
      400,
    );
  }

  if (record.code !== inputCode) {
    const remainingTtl = await redis.ttl(key);
    if (remainingTtl > 0) {
      await redis.set(key, JSON.stringify(record), "EX", remainingTtl);
    }
    const remaining = config.OTP_MAX_ATTEMPTS - record.attempts;
    throw new AppError(
      `Incorrect OTP. ${remaining} attempt(s) remaining.`,
      400,
    );
  }

  await redis.del(key);
  return true;
}
