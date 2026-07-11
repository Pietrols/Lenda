import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { theme } from "../../theme";
import { bookingsApi, type BookingListItem } from "../../api/bookings";
import { ApiError } from "../../api/client";
import { useAuthStore } from "../../store/auth.store";
import { ErrorState } from "../../components/ErrorState";
import { formatDateRange } from "../../lib/dates";

const filters = ["DISPUTED", "PENDING", "ACTIVE", "ALL"] as const;
type Filter = (typeof filters)[number];

const statusColors: Record<string, string> = {
  DISPUTED: theme.colors.error,
  CANCELLED: theme.colors.mutedForeground,
  COMPLETED: theme.colors.success,
  PENDING: theme.colors.warning,
};

function BookingRow({
  booking,
  onPress,
}: {
  booking: BookingListItem;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {booking.listing.title}
        </Text>
        <Text
          style={[
            styles.statusText,
            { color: statusColors[booking.status] ?? theme.colors.gold },
          ]}
        >
          {booking.status.replace(/_/g, " ")}
        </Text>
      </View>
      <Text style={styles.cardMeta}>
        {formatDateRange(booking.startDate, booking.endDate)}
      </Text>
      <Text style={styles.cardParties} numberOfLines={1}>
        Guest: {booking.guest.fullName ?? booking.guest.email}
      </Text>
      <Text style={styles.cardParties} numberOfLines={1}>
        Host: {booking.host.fullName ?? booking.host.email}
      </Text>
      <Text style={styles.cardAmount}>
        {booking.currency} {Number(booking.totalAmount).toLocaleString()}
      </Text>
    </Pressable>
  );
}

export default function AdminBookingsScreen() {
  const router = useRouter();
  const isAdmin = useAuthStore(
    (s) => s.user?.roles.includes("ADMIN") ?? false,
  );

  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("DISPUTED");

  const fetchBookings = useCallback(async (refreshing = false) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      // Admin tokens receive every booking on the platform from GET
      // /bookings; walk the cursor to collect them all.
      const all: BookingListItem[] = [];
      let cursor: string | undefined;
      do {
        const res = await bookingsApi.getAll(cursor);
        all.push(...res.bookings);
        cursor = res.nextCursor ?? undefined;
      } while (cursor);
      setBookings(all);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load bookings. Please try again.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const filtered = useMemo(
    () =>
      filter === "ALL"
        ? bookings
        : bookings.filter((b) => b.status === filter),
    [bookings, filter],
  );

  if (!isAdmin) return <Redirect href="/(tabs)" />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft
            size={theme.typography.size.xxl}
            color={theme.colors.foreground}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Bookings</Text>
        <Text style={styles.headerCount}>{filtered.length}</Text>
      </View>

      <View style={styles.filterRow}>
        {filters.map((f) => (
          <Pressable
            key={f}
            style={[styles.filterPill, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>Loading bookings...</Text>
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchBookings()} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BookingRow
              booking={item}
              onPress={() => router.push(`/booking/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.stateText}>
              {filter === "ALL"
                ? "No bookings yet."
                : `No ${filter.toLowerCase()} bookings.`}
            </Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchBookings(true)}
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
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  headerTitle: {
    flex: 1,
    color: theme.colors.foreground,
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
  },
  headerCount: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  filterRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  filterPill: {
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  filterActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodySemibold,
  },
  filterTextActive: {
    color: theme.colors.primaryForeground,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stateText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  cardTitle: {
    flexShrink: 1,
    color: theme.colors.foreground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.bodySemibold,
  },
  statusText: {
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodySemibold,
  },
  cardMeta: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  cardParties: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  cardAmount: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
});
