import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ImageOff } from "lucide-react-native";
import { theme } from "../../theme";
import { bookingsApi, type BookingListItem } from "../../api/bookings";
import { ApiError } from "../../api/client";
import { useAuthStore } from "../../store/auth.store";
import { BookingStatusBadge } from "../../components/BookingStatusBadge";
import { ErrorState } from "../../components/ErrorState";
import { RowCardSkeleton } from "../../components/Skeleton";
import { formatDateRange } from "../../lib/dates";

function primaryImageUrl(booking: BookingListItem): string | null {
  return (
    booking.listing.images.find((image) => image.isPrimary)?.url ??
    booking.listing.images[0]?.url ??
    null
  );
}

function BookingCard({
  booking,
  onPress,
}: {
  booking: BookingListItem;
  onPress: () => void;
}) {
  const imageUrl = primaryImageUrl(booking);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.cardImage, styles.imagePlaceholder]}>
          <ImageOff
            size={theme.typography.size.xl}
            color={theme.colors.mutedForeground}
          />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {booking.listing.title}
        </Text>
        <BookingStatusBadge status={booking.status} />
        <Text style={styles.dates}>
          {formatDateRange(booking.startDate, booking.endDate)}
        </Text>
        <Text style={styles.amount}>
          {booking.currency} {Number(booking.totalAmount).toLocaleString()}
        </Text>
      </View>
    </Pressable>
  );
}

type RoleSegment = "ALL" | "GUEST" | "HOST";

const segments: { value: RoleSegment; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "GUEST", label: "As guest" },
  { value: "HOST", label: "As host" },
];

export default function BookingsScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const isHost = useAuthStore(
    (s) => s.user?.roles.includes("HOST") ?? false,
  );
  const [segment, setSegment] = useState<RoleSegment>("ALL");
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async (refreshing = false) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const res = await bookingsApi.getAll();
      setBookings(res.bookings);
      setNextCursor(res.nextCursor);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load your bookings. Please try again.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const loadMore = async () => {
    if (!nextCursor || isLoadingMore || isLoading) return;
    setIsLoadingMore(true);
    try {
      const res = await bookingsApi.getAll(nextCursor);
      setBookings((prev) => [...prev, ...res.bookings]);
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
        <Text style={styles.title}>Bookings</Text>
      </View>

      {isHost && (
        <View style={styles.segmentRow}>
          {segments.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setSegment(option.value)}
              style={[
                styles.segmentPill,
                segment === option.value && styles.segmentPillActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  segment === option.value && styles.segmentTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {isLoading ? (
        <View style={styles.listContent}>
          <RowCardSkeleton />
          <RowCardSkeleton />
          <RowCardSkeleton />
          <RowCardSkeleton />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchBookings()} />
      ) : (
        <FlatList
          data={bookings.filter((booking) =>
            segment === "ALL"
              ? true
              : segment === "GUEST"
                ? booking.guestId === userId
                : booking.hostId === userId,
          )}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => router.push(`/booking/${item.id}`)}
            />
          )}
          contentContainerStyle={
            bookings.length === 0 ? styles.centerContent : styles.listContent
          }
          ListEmptyComponent={
            <Text style={styles.stateText}>
              No bookings yet. Book something from Browse to get started.
            </Text>
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isLoadingMore ? (
              <Text style={styles.stateText}>Loading more...</Text>
            ) : null
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
  segmentRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  segmentPill: {
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  segmentPillActive: {
    backgroundColor: theme.colors.gold,
    borderColor: theme.colors.gold,
  },
  segmentText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodySemibold,
  },
  segmentTextActive: {
    color: theme.colors.primaryForeground,
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
    gap: theme.spacing.md,
  },
  stateText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
    textAlign: "center",
  },
  card: {
    flexDirection: "row",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  cardImage: {
    width: theme.spacing.xxl * 2 + theme.spacing.md,
    height: "100%",
  },
  imagePlaceholder: {
    backgroundColor: theme.colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  cardTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.bodySemibold,
  },
  dates: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  amount: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
});
