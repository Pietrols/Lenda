import type { CreateReviewInput } from "@lenda/schemas";
import { api, BOOKING_URL } from "./client";
import { useAuthStore } from "../store/auth.store";

export type { CreateReviewInput };

export type ReviewType = "GUEST_TO_HOST" | "HOST_TO_GUEST";

export type Review = {
  id: string;
  bookingId: string;
  reviewerId: string;
  revieweeId: string;
  type: ReviewType;
  rating: number;
  comment: string | null;
  isVisible: boolean;
  removedById: string | null;
  removedAt: string | null;
  removedNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReviewReviewer = {
  id: string;
  fullName: string | null;
  photoUrl: string | null;
};

// GET /reviews/listing/:listingId returns guest-to-host reviews only, each
// with the reviewer summary attached.
export type ListingReview = Review & {
  reviewer: ReviewReviewer;
};

// GET /reviews/user/:userId returns reviews about a user (both directions),
// each with the reviewer and a booking/listing summary attached.
export type UserReview = Review & {
  reviewer: ReviewReviewer;
  booking: {
    id: string;
    listing: { id: string; title: string };
  };
};

export const reviewsApi = {
  create: (input: CreateReviewInput) => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.post<{ review: Review }>("/reviews", input, token, BOOKING_URL);
  },

  getForListing: (listingId: string) =>
    api.get<{ reviews: ListingReview[] }>(
      `/reviews/listing/${listingId}`,
      undefined,
      BOOKING_URL,
    ),

  getForUser: (userId: string) =>
    api.get<{ reviews: UserReview[] }>(
      `/reviews/user/${userId}`,
      undefined,
      BOOKING_URL,
    ),
};
