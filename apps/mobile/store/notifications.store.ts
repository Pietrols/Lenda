import { create } from "zustand";

// Unread notification count shared between the tab bar badge (which polls)
// and the notifications screen (which zeroes it after marking all read).
// Intentionally not persisted: it is cheap to refetch and stale counts are
// worse than a brief empty badge.
type NotificationsState = {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
};

export const useNotificationsStore = create<NotificationsState>()((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
}));
