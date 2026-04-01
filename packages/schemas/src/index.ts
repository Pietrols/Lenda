import { z } from "zod";
import { Role } from "@lenda/types";

// ── Auth Schemas ──────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
  roles: z.array(z.nativeEnum(Role)).min(1, "At least one role is required"),
});

export const VerifyEmailSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export const SendPhoneOtpSchema = z.object({
  phone: z.string().min(7, "Invalid phone number"),
});

export const VerifyPhoneSchema = z.object({
  phone: z.string().min(7),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

// ── Inferred Types ────────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
export type SendPhoneOtpInput = z.infer<typeof SendPhoneOtpSchema>;
export type VerifyPhoneInput = z.infer<typeof VerifyPhoneSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

export const CreateListingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  pillar: z.enum(["RENTAL", "SERVICE"]),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  pricePerDay: z.number().positive("Price must be positive"),
  currency: z.string().default("USD"),
  location: z.string().min(1, "Location is required"),
  metadata: z.record(z.unknown()).default({}),
});

export type CreateListingInput = z.infer<typeof CreateListingSchema>;

export const GetListingsQuerySchema = z.object({
  pillar: z.enum(["RENTAL", "SERVICE"]).optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
export type GetListingsQueryInput = z.infer<typeof GetListingsQuerySchema>;

export const CreateBookingSchema = z.object({
  listingId: z.string().uuid("Invalid listing ID"),
  startDate: z.string().datetime("Invalid start date"),
  endDate: z.string().datetime("Invalid end date"),
  pickupType: z.enum(["CLIENT_TO_HOST", "HOST_TO_CLIENT"]),
  pickupLocation: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

export const UpdateListingSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  pricePerDay: z.number().positive().optional(),
  currency: z.string().optional(),
  location: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type UpdateListingInput = z.infer<typeof UpdateListingSchema>;

export const CreateReviewSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(1000).optional(),
});

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;

export const CreateLikeSchema = z.object({
  targetId: z.string().uuid("Invalid target ID"),
  targetType: z.enum(["LISTING", "REVIEW", "USER"]),
});

export type CreateLikeInput = z.infer<typeof CreateLikeSchema>;

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  photoUrl: z.string().url("Invalid photo URL").optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  phone: z.string().min(7).max(20).optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const MarkNotificationReadSchema = z.object({
  ids: z
    .array(z.string().uuid())
    .min(1, "At least one notification ID required"),
});

export type MarkNotificationReadInput = z.infer<
  typeof MarkNotificationReadSchema
>;

export const UpgradeSubscriptionSchema = z.object({
  plan: z.enum(["PRO_MONTHLY", "PRO_ANNUAL"]),
});

export type UpgradeSubscriptionInput = z.infer<
  typeof UpgradeSubscriptionSchema
>;
