import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { redis, redisKeys } from "../lib/redis";
import {
  signAccessToken,
  signRefreshToken,
  durationToSeconds,
  verifyRefreshToken,
} from "../lib/jwt";
import { createOtp, verifyOtp } from "../lib/otp";
import { sendOtpEmail } from "../lib/mailer";
import { AppError, Errors } from "../lib/AppError";
import { config } from "../config";
import type {
  RegisterPayload,
  VerifyEmailPayload,
  VerifyPhonePayload,
  LoginPayload,
  AuthResponse,
  MessageResponse,
  Role,
  KycStatus,
} from "@lenda/types";

// ── Register ──────────────────────────────────────────────────────────────────

export async function register(
  data: RegisterPayload,
): Promise<MessageResponse> {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw Errors.conflict("An account with this email already exists.");
  }

  // bcrypt cost factor 12 = ~300ms. Slow by design - makes brute force expensive.
  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      phone: data.phone ?? null,
      passwordHash,
      roles: Array.from(
        new Set(["GUEST", ...(data.roles ?? [])]),
      ) as unknown as any,
    },
  });

  const otp = await createOtp(redisKeys.emailOtp(user.email));
  await sendOtpEmail(user.email, otp);

  return {
    message:
      "Account created. Please check your email for a verification code.",
  };
}

// ── Verify Email ──────────────────────────────────────────────────────────────

export async function verifyEmail(
  data: VerifyEmailPayload,
): Promise<MessageResponse> {
  const user = await prisma.user.findUnique({ where: { email: data.email } });

  if (!user) throw Errors.notFound("No account found with this email.");
  if (user.emailVerified) throw new AppError("Email is already verified.", 400);

  await verifyOtp(redisKeys.emailOtp(data.email), data.otp);

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true },
  });

  return { message: "Email verified successfully." };
}

// ── Resend Email OTP ──────────────────────────────────────────────────────────

export async function resendEmailOtp(email: string): Promise<MessageResponse> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) throw Errors.notFound("No account found with this email.");
  if (user.emailVerified) throw Errors.badRequest("Email is already verified.");

  const otp = await createOtp(redisKeys.emailOtp(email));
  await sendOtpEmail(email, otp);

  return { message: "A new verification code has been sent to your email." };
}

// ── Send Phone OTP ────────────────────────────────────────────────────────────

export async function sendPhoneOtp(phone: string): Promise<MessageResponse> {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw Errors.notFound("No account found with this phone number.");

  const otp = await createOtp(redisKeys.phoneOtp(phone));
  console.log(`DEV SMS OTP for ${phone}: ${otp}`);

  return { message: "Verification code sent to your phone." };
}

// ── Verify Phone ──────────────────────────────────────────────────────────────

export async function verifyPhone(
  data: VerifyPhonePayload,
): Promise<MessageResponse> {
  const user = await prisma.user.findUnique({ where: { phone: data.phone } });

  if (!user) throw Errors.notFound("No account found with this phone number.");
  if (user.phoneVerified) return { message: "Phone is already verified." };

  await verifyOtp(redisKeys.phoneOtp(data.phone), data.otp);

  await prisma.user.update({
    where: { id: user.id },
    data: { phoneVerified: true },
  });

  return { message: "Phone verified successfully." };
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function login(data: LoginPayload): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({ where: { email: data.email } });

  // Same error for "not found" and "wrong password" - prevents user enumeration
  const invalidCredentials = new AppError(
    "Invalid email or password.",
    401,
    "INVALID_CREDENTIALS",
  );

  if (!user) throw invalidCredentials;

  const passwordValid = await bcrypt.compare(data.password, user.passwordHash);
  if (!passwordValid) throw invalidCredentials;

  if (!user.isActive) {
    throw new AppError(
      "Your account has been suspended. Please contact support.",
      403,
      "ACCOUNT_SUSPENDED",
    );
  }

  if (!user.emailVerified) {
    throw new AppError(
      "Please verify your email address before logging in.",
      403,
      "EMAIL_NOT_VERIFIED",
    );
  }

  const accessToken = signAccessToken(user.id, user.roles as unknown as Role[]);
  const { token: refreshToken, jti } = signRefreshToken(user.id);

  await redis.set(
    redisKeys.refreshToken(user.id, jti),
    user.id,
    "EX",
    durationToSeconds(config.JWT_REFRESH_EXPIRES_IN),
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      roles: user.roles as unknown as Role[],
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      kycStatus: user.kycStatus as unknown as KycStatus,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: durationToSeconds(config.JWT_ACCESS_EXPIRES_IN),
    },
  };
}

// ── Refresh ───────────────────────────────────────────────────────────────────

export async function refreshTokens(token: string): Promise<AuthResponse> {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw Errors.unauthorized("Invalid or expired refresh token.");
  }

  const stored = await redis.get(
    redisKeys.refreshToken(payload.sub, payload.jti),
  );
  if (!stored) {
    throw Errors.unauthorized(
      "Refresh token has been revoked or already used.",
    );
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) {
    throw Errors.unauthorized("Account not found or suspended.");
  }

  // Delete old token (rotation - old token is now invalid)
  await redis.del(redisKeys.refreshToken(payload.sub, payload.jti));

  const newAccessToken = signAccessToken(
    user.id,
    user.roles as unknown as Role[],
  );
  const { token: newRefreshToken, jti: newJti } = signRefreshToken(user.id);

  await redis.set(
    redisKeys.refreshToken(user.id, newJti),
    user.id,
    "EX",
    durationToSeconds(config.JWT_REFRESH_EXPIRES_IN),
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      roles: user.roles as unknown as Role[],
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      kycStatus: user.kycStatus as unknown as KycStatus,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    tokens: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: durationToSeconds(config.JWT_ACCESS_EXPIRES_IN),
    },
  };
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logout(
  userId: string,
  accessJti: string,
  refreshToken?: string,
): Promise<MessageResponse> {
  // Blacklist access token for its remaining lifetime
  await redis.set(
    redisKeys.tokenBlacklist(accessJti),
    "1",
    "EX",
    durationToSeconds(config.JWT_ACCESS_EXPIRES_IN),
  );

  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await redis.del(redisKeys.refreshToken(userId, payload.jti));
    } catch {
      // Already invalid - fine, we are logging out anyway
    }
  }

  return { message: "Logged out successfully." };
}

// ── Get Current User ──────────────────────────────────────────────────────────

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
      roles: true,
      emailVerified: true,
      phoneVerified: true,
      kycStatus: true,
      isActive: true,
      fullName: true,
      photoUrl: true,
      bio: true,
      location: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) throw Errors.notFound("User not found.");
  return user;
}

import { sendPasswordResetEmail } from "../lib/mailer";

export async function forgotPassword(email: string): Promise<MessageResponse> {
  const user = await prisma.user.findUnique({ where: { email } });

  // Don't reveal whether email exists - always return success
  if (!user)
    return { message: "If an account exists, a reset code has been sent." };

  const otp = await createOtp(redisKeys.passwordReset(email));
  await sendPasswordResetEmail(email, otp);

  return { message: "If an account exists, a reset code has been sent." };
}

export async function resetPassword(
  email: string,
  otp: string,
  newPassword: string,
): Promise<MessageResponse> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw Errors.notFound("No account found with this email.");

  await verifyOtp(redisKeys.passwordReset(email), otp);

  const passwordHash = await bcrypt.hash(newPassword, 12);

  // Entering the OTP we emailed proves ownership of the address, so a
  // successful reset also verifies the email. Otherwise a user who registered
  // but never verified stays locked out of login even after proving ownership.
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, emailVerified: true },
  });

  return { message: "Password reset successfully. You can now log in." };
}
