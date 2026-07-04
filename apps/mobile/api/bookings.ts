import type { CreateBookingInput } from "@lenda/schemas";
import { api, BOOKING_URL } from "./client";
import { useAuthStore } from "../store/auth.store";

export type { CreateBookingInput };

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "EN_ROUTE"
  | "HANDED_OVER"
  | "ACTIVE"
  | "RETURN_PENDING"
  | "RETURNED"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

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

export type BookingImage = {
  id: string;
  listingId: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  order: number;
  createdAt: string;
};

export type BookingListingSummary = {
  id: string;
  title: string;
  category: string;
  location: string;
  images: BookingImage[];
};

export type BookingListingDetail = BookingListingSummary & {
  pillar: "RENTAL" | "SERVICE";
  pricePerDay: string;
};

export type BookingParty = {
  id: string;
  fullName: string | null;
  email: string;
};

export type BookingHandover = {
  id: string;
  bookingId: string;
  type: "PICKUP" | "RETURN";
  guestConfirmed: boolean;
  hostConfirmed: boolean;
  guestConfirmedAt: string | null;
  hostConfirmedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type BookingNegotiationFields = {
  isNegotiable: boolean;
  budgetMin: string | null;
  budgetMax: string | null;
  currentOffer: string | null;
  hostCounterCount: number;
  guestCounterCount: number;
  negotiationExpiresAt: string | null;
  lastActorId: string | null;
};

export type BookingListItem = Omit<Booking, "history"> &
  BookingNegotiationFields & {
    listing: BookingListingSummary;
    guest: BookingParty;
    host: BookingParty;
    history: BookingHistoryEntry[];
  };

export type BookingDetail = Omit<Booking, "history"> &
  BookingNegotiationFields & {
    listing: BookingListingDetail;
    history: BookingHistoryEntry[];
    handovers: BookingHandover[];
  };

export type BookingsListResponse = {
  bookings: BookingListItem[];
  nextCursor: string | null;
};

export type BookingDetailResponse = {
  booking: BookingDetail;
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

  getAll: () => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.get<BookingsListResponse>("/bookings", token, BOOKING_URL);
  },

  getById: (id: string) => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.get<BookingDetailResponse>(
      `/bookings/${id}`,
      token,
      BOOKING_URL,
    );
  },

  // PATCH /bookings/:id/status transitions the booking. The response is the
  // updated record with history but without the listing/guest/host relations,
  // so callers should refetch via getById() to refresh the full detail view.
  updateStatus: (id: string, status: BookingStatus, reason?: string) => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.patch<CreateBookingResponse>(
      `/bookings/${id}/status`,
      { status, ...(reason ? { reason } : {}) },
      token,
      BOOKING_URL,
    );
  },
};
