import Redis from "ioredis";
import { config } from "../config";

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on("connect", () => console.log("Redis connected"));
redis.on("error", (err) => console.error("Redis error:", err.message));

//  Key builders ──────────────────────────────────────────────────────────────
// Keeps key format consistent - never type a Redis key string more than once
export const redisKeys = {
  emailOtp: (email: string) => `otp:email:${email.toLowerCase()}`,
  phoneOtp: (phone: string) => `otp:phone:${phone}`,
  refreshToken: (userId: string, jti: string) => `refresh:${userId}:${jti}`,
  tokenBlacklist: (jti: string) => `blacklist:${jti}`,
  passwordReset: (email: string) => `otp:reset:${email.toLowerCase()}`,
};
