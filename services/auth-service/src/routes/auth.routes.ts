import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import { asyncHandler } from "../middleware/errorHandler";
import { config } from "../config";
import * as ctrl from "../controllers/auth.controller";
import {
  RegisterSchema,
  VerifyEmailSchema,
  VerifyPhoneSchema,
  SendPhoneOtpSchema,
  LoginSchema,
  RefreshTokenSchema,
} from "@lenda/schemas";

const router: Router = Router();

// Strict per-IP limiter for credential and OTP endpoints. The app-level
// limiter (1000/15min) exists to stop floods, not brute force: 6-digit OTPs
// and password guessing need a much tighter budget. 30 attempts per 15
// minutes accommodates real users mistyping while making enumeration and
// credential stuffing impractical. Skipped under test so the suites (which
// legitimately hammer these routes from one IP) are unaffected.
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: "Too many attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.NODE_ENV === "test",
});

router.post(
  "/register",
  sensitiveLimiter,
  validate(RegisterSchema),
  asyncHandler(ctrl.register),
);
router.post(
  "/verify-email",
  sensitiveLimiter,
  validate(VerifyEmailSchema),
  asyncHandler(ctrl.verifyEmail),
);
router.post(
  "/resend-email-otp",
  sensitiveLimiter,
  validate(z.object({ email: z.string().email() })),
  asyncHandler(ctrl.resendEmailOtp),
);
router.post(
  "/send-phone-otp",
  sensitiveLimiter,
  validate(SendPhoneOtpSchema),
  asyncHandler(ctrl.sendPhoneOtp),
);
router.post(
  "/verify-phone",
  sensitiveLimiter,
  validate(VerifyPhoneSchema),
  asyncHandler(ctrl.verifyPhone),
);
router.post(
  "/login",
  sensitiveLimiter,
  validate(LoginSchema),
  asyncHandler(ctrl.login),
);
router.post(
  "/refresh",
  validate(RefreshTokenSchema),
  asyncHandler(ctrl.refresh),
);
router.post(
  "/resend-otp",
  sensitiveLimiter,
  validate(z.object({ email: z.string().email() })),
  asyncHandler(ctrl.resendEmailOtp),
);

// Protected routes
router.post("/logout", authenticate, asyncHandler(ctrl.logout));
router.get("/me", authenticate, asyncHandler(ctrl.getMe));

// Push device tokens (storage only — no push-sending yet).
router.post(
  "/device-tokens",
  authenticate,
  validate(
    z.object({
      token: z.string().min(1),
      platform: z.string().min(1),
    }),
  ),
  asyncHandler(ctrl.addDeviceToken),
);
router.delete(
  "/device-tokens/:token",
  authenticate,
  asyncHandler(ctrl.deleteDeviceToken),
);

router.post(
  "/forgot-password",
  sensitiveLimiter,
  validate(z.object({ email: z.string().email() })),
  asyncHandler(ctrl.forgotPassword),
);
router.post(
  "/reset-password",
  sensitiveLimiter,
  validate(
    z.object({
      email: z.string().email(),
      otp: z.string().length(6),
      newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
    }),
  ),
  asyncHandler(ctrl.resetPassword),
);

export default router;
