import { api, BOOKING_URL } from "./client";
import { useAuthStore } from "../store/auth.store";

// Per-booking chat between the two parties. Fetching the thread marks the
// other party's messages as read server-side.
export type BookingMessage = {
  id: string;
  bookingId: string;
  senderId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    fullName: string | null;
    photoUrl: string | null;
  };
};

export const messagesApi = {
  // Ascending by createdAt.
  getAll: (bookingId: string) => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.get<{ messages: BookingMessage[] }>(
      `/bookings/${bookingId}/messages`,
      token,
      BOOKING_URL,
    );
  },

  send: (bookingId: string, message: string) => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.post<{ message: BookingMessage }>(
      `/bookings/${bookingId}/messages`,
      { message },
      token,
      BOOKING_URL,
    );
  },

  getUnreadCount: (bookingId: string) => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.get<{ count: number }>(
      `/bookings/${bookingId}/messages/unread`,
      token,
      BOOKING_URL,
    );
  },
};
