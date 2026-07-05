import { api, BOOKING_URL } from "./client";
import { useAuthStore } from "../store/auth.store";

export type Notification = {
  id: string;
  userId: string;
  type: string;
  message: string;
  isRead: boolean;
  // Usually a booking id for booking-related types; null for e.g. TIP.
  referenceId: string | null;
  createdAt: string;
};

export type NotificationsResponse = {
  notifications: Notification[];
  nextCursor: string | null;
};

export const notificationsApi = {
  getAll: (cursor?: string) => {
    const token = useAuthStore.getState().tokens?.accessToken;
    const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return api.get<NotificationsResponse>(
      `/notifications${qs}`,
      token,
      BOOKING_URL,
    );
  },

  getUnreadCount: () => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.get<{ count: number }>(
      "/notifications/unread-count",
      token,
      BOOKING_URL,
    );
  },

  // Omitting ids marks everything read.
  markRead: (ids?: string[]) => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.patch<{ message: string }>(
      "/notifications/read",
      ids && ids.length > 0 ? { ids } : {},
      token,
      BOOKING_URL,
    );
  },
};
