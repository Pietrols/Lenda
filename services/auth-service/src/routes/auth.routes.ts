import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import { asyncHandler } from "../middleware/errorHandler";
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

router.post("/register", validate(RegisterSchema), asyncHandler(ctrl.register));
router.post(
  "/verify-email",
  validate(VerifyEmailSchema),
  asyncHandler(ctrl.verifyEmail),
);
router.post(
  "/resend-email-otp",
  validate(z.object({ email: z.string().email() })),
  asyncHandler(ctrl.resendEmailOtp),
);
router.post(
  "/send-phone-otp",
  validate(SendPhoneOtpSchema),
  asyncHandler(ctrl.sendPhoneOtp),
);
router.post(
  "/verify-phone",
  validate(VerifyPhoneSchema),
  asyncHandler(ctrl.verifyPhone),
);
router.post("/login", validate(LoginSchema), asyncHandler(ctrl.login));
router.post(
  "/refresh",
  validate(RefreshTokenSchema),
  asyncHandler(ctrl.refresh),
);
router.post(
  "/resend-otp",
  validate(z.object({ email: z.string().email() })),
  asyncHandler(ctrl.resendEmailOtp),
);

// Protected routes
router.post("/logout", authenticate, asyncHandler(ctrl.logout));
router.get("/me", authenticate, asyncHandler(ctrl.getMe));

export default router;
