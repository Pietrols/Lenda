import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { BellOff } from "lucide-react-native";
import { theme } from "../../theme";
import {
  notificationsApi,
  type Notification,
} from "../../api/notifications";
import { ApiError } from "../../api/client";
import { useNotificationsStore } from "../../store/notifications.store";
import { ErrorState } from "../../components/ErrorState";
import { RowCardSkeleton } from "../../components/Skeleton";
import { formatDate } from "../../lib/dates";

function targetFor(notification: Notification): string | null {
  if (notification.type.startsWith("KYC")) return "/kyc-upload";
  if (notification.referenceId) return `/booking/${notification.referenceId}`;
  return null;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const setUnreadCount = useNotificationsStore((s) => s.setUnreadCount);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      try {
        const res = await notificationsApi.getAll();
        setNotifications(res.notifications);
        setNextCursor(res.nextCursor);
        // Opening the list counts as reading everything; keep the fetched
        // isRead flags for display so just-arrived items still stand out.
        notificationsApi.markRead().catch(() => {});
        setUnreadCount(0);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load notifications. Please try again.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [setUnreadCount],
  );

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications]),
  );

  const loadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await notificationsApi.getAll(nextCursor);
      setNotifications((prev) => [...prev, ...res.notifications]);
      setNextCursor(res.nextCursor);
    } catch {
      // Pagination failures are silent; pull-to-refresh recovers.
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
      </View>

      {isLoading ? (
        <View style={styles.listContent}>
          <RowCardSkeleton />
          <RowCardSkeleton />
          <RowCardSkeleton />
          <RowCardSkeleton />
          <RowCardSkeleton />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchNotifications()} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const target = targetFor(item);
            const row = (
              <View
                style={[styles.row, !item.isRead && styles.rowUnread]}
              >
                <View style={styles.rowBody}>
                  <Text style={styles.message}>{item.message}</Text>
                  <Text style={styles.time}>{formatDate(item.createdAt)}</Text>
                </View>
                {!item.isRead && <View style={styles.unreadDot} />}
              </View>
            );
            if (!target) return row;
            return (
              <Pressable onPress={() => router.push(target as never)}>
                {row}
              </Pressable>
            );
          }}
          contentContainerStyle={
            notifications.length === 0
              ? styles.centerContent
              : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <BellOff
                size={theme.typography.size.xxl}
                color={theme.colors.mutedForeground}
              />
              <Text style={styles.stateText}>No notifications yet.</Text>
            </View>
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchNotifications(true)}
              tintColor={theme.colors.gold}
              colors={[theme.colors.gold]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  centerContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  stateText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
    textAlign: "center",
  },
  empty: {
    alignItems: "center",
    gap: theme.spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  rowUnread: {
    borderColor: theme.colors.gold,
  },
  rowBody: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  message: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
    lineHeight: theme.typography.size.lg,
  },
  time: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  unreadDot: {
    width: theme.spacing.sm,
    height: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.gold,
  },
});
