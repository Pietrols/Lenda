import { useCallback, useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, ImageOff, MapPin } from "lucide-react-native";
import { theme } from "../../theme";
import {
  bookingsApi,
  type BookingDetail,
  type BookingHistoryEntry,
} from "../../api/bookings";
import { ApiError } from "../../api/client";
import { BookingStatusBadge } from "../../components/BookingStatusBadge";

const pickupLabels: Record<BookingDetail["pickupType"], string> = {
  CLIENT_TO_HOST: "Pick up from host",
  HOST_TO_CLIENT: "Host delivers",
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

function formatRange(start: string, end: string): string {
  return `${new Date(start).toDateString()} - ${new Date(end).toDateString()}`;
}

function TimelineEntry({
  entry,
  isLast,
}: {
  entry: BookingHistoryEntry;
  isLast: boolean;
}) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRail}>
        <View style={styles.timelineDot} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.timelineContent}>
        <Text style={styles.timelineStatus}>
          {entry.toStatus.replaceAll("_", " ")}
        </Text>
        {entry.reason && (
          <Text style={styles.timelineReason}>{entry.reason}</Text>
        )}
        <Text style={styles.timelineTime}>
          {formatTimestamp(entry.createdAt)}
        </Text>
      </View>
    </View>
  );
}

export default function BookingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBooking = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await bookingsApi.getById(id);
      setBooking(res.booking);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load this booking. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const imageUrl = booking
    ? (booking.listing.images.find((image) => image.isPrimary)?.url ??
      booking.listing.images[0]?.url ??
      null)
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft
            size={theme.typography.size.xxl}
            color={theme.colors.foreground}
          />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {booking?.listing.title ?? "Booking"}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>Loading booking...</Text>
        </View>
      ) : error || !booking ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>{error ?? "Booking not found."}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Pressable
            style={styles.listingCard}
            onPress={() => router.push(`/listing/${booking.listingId}`)}
          >
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.listingImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.listingImage, styles.imagePlaceholder]}>
                <ImageOff
                  size={theme.typography.size.xxl}
                  color={theme.colors.mutedForeground}
                />
              </View>
            )}
            <View style={styles.listingInfo}>
              <Text style={styles.listingTitle} numberOfLines={2}>
                {booking.listing.title}
              </Text>
              <Text style={styles.listingCategory}>
                {booking.listing.category}
              </Text>
              <View style={styles.metaRow}>
                <MapPin
                  size={theme.typography.size.xs}
                  color={theme.colors.mutedForeground}
                />
                <Text style={styles.metaText} numberOfLines={1}>
                  {booking.listing.location}
                </Text>
              </View>
            </View>
          </Pressable>

          <View style={styles.statusRow}>
            <BookingStatusBadge status={booking.status} />
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Dates</Text>
              <Text style={styles.summaryValue}>
                {formatRange(booking.startDate, booking.endDate)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Duration</Text>
              <Text style={styles.summaryValue}>
                {booking.totalDays} {booking.totalDays === 1 ? "day" : "days"}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryTotal}>
                {booking.currency}{" "}
                {Number(booking.totalAmount).toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Pickup</Text>
              <Text style={styles.summaryValue}>
                {pickupLabels[booking.pickupType]}
              </Text>
            </View>
            {booking.pickupLocation && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Pickup location</Text>
                <Text style={styles.summaryValue}>
                  {booking.pickupLocation}
                </Text>
              </View>
            )}
            {booking.notes && (
              <View style={styles.notesBlock}>
                <Text style={styles.summaryLabel}>Notes</Text>
                <Text style={styles.notesText}>{booking.notes}</Text>
              </View>
            )}
          </View>

          <Text style={styles.sectionTitle}>Status history</Text>
          <View style={styles.timeline}>
            {booking.history.map((entry, index) => (
              <TimelineEntry
                key={entry.id}
                entry={entry}
                isLast={index === booking.history.length - 1}
              />
            ))}
          </View>
        </ScrollView>
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  stateText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
    textAlign: "center",
  },
  scrollContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  listingCard: {
    flexDirection: "row",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  listingImage: {
    width: theme.spacing.xxl * 2,
    height: "100%",
  },
  imagePlaceholder: {
    backgroundColor: theme.colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  listingInfo: {
    flex: 1,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  listingTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.bodySemibold,
  },
  listingCategory: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyMedium,
    textTransform: "uppercase",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  metaText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
    flexShrink: 1,
  },
  statusRow: {
    flexDirection: "row",
  },
  summaryCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  summaryLabel: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyMedium,
    textTransform: "uppercase",
  },
  summaryValue: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
    flexShrink: 1,
    textAlign: "right",
  },
  summaryTotal: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.displayBold,
  },
  notesBlock: {
    gap: theme.spacing.xs,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    paddingTop: theme.spacing.sm,
  },
  notesText: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
  sectionTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
    marginTop: theme.spacing.sm,
  },
  timeline: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  timelineRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  timelineRail: {
    alignItems: "center",
    width: theme.spacing.md,
  },
  timelineDot: {
    width: theme.spacing.sm + theme.spacing.xs / 2,
    height: theme.spacing.sm + theme.spacing.xs / 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.gold,
    marginTop: theme.spacing.xs / 2,
  },
  timelineLine: {
    flex: 1,
    width: theme.spacing.xs / 2,
    backgroundColor: theme.colors.border,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.xs / 2,
  },
  timelineStatus: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  timelineReason: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  timelineTime: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
});
