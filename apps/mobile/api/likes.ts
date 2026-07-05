import { api, BOOKING_URL } from "./client";
import { useAuthStore } from "../store/auth.store";
import type { MyListing } from "./listings";

export type LikeTargetType = "LISTING" | "REVIEW" | "USER";

// GET /likes/me/listings returns the like rows with the listing (primary
// image only) attached; the listing shape matches /listings/mine items.
export type MyLike = {
  id: string;
  targetId: string;
  createdAt: string;
  listing: MyListing;
};

export const likesApi = {
  // Toggles: liking an already-liked target unlikes it.
  toggle: (targetId: string, targetType: LikeTargetType = "LISTING") => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.post<{ liked: boolean }>(
      "/likes",
      { targetId, targetType },
      token,
      BOOKING_URL,
    );
  },

  getCount: (targetId: string, targetType: LikeTargetType = "LISTING") =>
    api.get<{ count: number }>(
      `/likes/${targetType}/${targetId}`,
      undefined,
      BOOKING_URL,
    ),

  getMyListings: () => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.get<{ likes: MyLike[] }>(
      "/likes/me/listings",
      token,
      BOOKING_URL,
    );
  },
};
