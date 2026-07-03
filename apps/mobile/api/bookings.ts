import type { CreateBookingInput } from "@lenda/schemas";
import { api, BOOKING_URL } from "./client";
import { useAuthStore } from "../store/auth.store";

export type { CreateBookingInput };

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED";

export type BookingHistoryEntry = {
  id: string;
  bookingId: string;
  fromStatus: string | null;
  toStatus: string;
  changedById: string;
  reason: string | null;
  createdAt: string;
};

export type Booking = {
  id: string;
  guestId: string;
  hostId: string;
  listingId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  priceSnapshot: string;
  currency: string;
  totalAmount: string;
  status: BookingStatus;
  pickupType: "CLIENT_TO_HOST" | "HOST_TO_CLIENT";
  pickupLocation: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  history: BookingHistoryEntry[];
};

export type CreateBookingResponse = {
  booking: Booking;
};

export const bookingsApi = {
  create: (input: CreateBookingInput) => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.post<CreateBookingResponse>(
      "/bookings",
      input,
      token,
      BOOKING_URL,
    );
  },
};
