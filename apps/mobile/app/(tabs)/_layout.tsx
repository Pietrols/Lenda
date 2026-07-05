import { useEffect } from "react";
import { Tabs } from "expo-router";
import { Bell, Calendar, House, Search, User } from "lucide-react-native";
import { theme } from "../../theme";
import { notificationsApi } from "../../api/notifications";
import { useNotificationsStore } from "../../store/notifications.store";

const UNREAD_POLL_MS = 30000;

export default function TabsLayout() {
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const setUnreadCount = useNotificationsStore((s) => s.setUnreadCount);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await notificationsApi.getUnreadCount();
        if (!cancelled) setUnreadCount(res.count);
      } catch {
        // Badge is best-effort; the next poll retries.
      }
    };
    poll();
    const interval = setInterval(poll, UNREAD_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [setUnreadCount]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.colors.gold,
        tabBarInactiveTintColor: theme.colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Calendar color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
          tabBarBadge:
            unreadCount > 0
              ? unreadCount > 99
                ? "99+"
                : unreadCount
              : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.colors.gold,
            color: theme.colors.primaryForeground,
            fontSize: theme.typography.size.xs,
            fontFamily: theme.typography.font.bodySemibold,
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
