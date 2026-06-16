import { z } from "zod";

// Mirrors CreateBookingSchema from packages/schemas/src/index.ts. Kept inline
// (as the web app does with its forms) so the mobile bundle doesn't need to
// resolve the built @lenda/schemas package through Metro.
export const CreateBookingSchema = z.object({
  listingId: z.string().uuid("Invalid listing ID"),
  startDate: z.string().datetime("Invalid start date"),
  endDate: z.string().datetime("Invalid end date"),
  pickupType: z.enum(["CLIENT_TO_HOST", "HOST_TO_CLIENT"]),
  pickupLocation: z.string().optional(),
  notes: z.string().optional(),
  isNegotiable: z.boolean().optional(),
  budgetMin: z.number().positive().optional(),
  budgetMax: z.number().positive().optional(),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
