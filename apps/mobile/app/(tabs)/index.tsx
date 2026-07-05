import { useCallback, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ChevronRight,
  ListChecks,
  Search,
  ShieldAlert,
} from "lucide-react-native";
import { theme } from "../../theme";
import { useAuthStore } from "../../store/auth.store";
import { bookingsApi, type BookingListItem } from "../../api/bookings";
import { listingsApi, type Listing } from "../../api/listings";
import { BookingStatusBadge } from "../../components/BookingStatusBadge";
import { formatDateRange } from "../../lib/dates";

const RECENT_BOOKINGS_SHOWN = 3;
const FEATURED_SHOWN = 6;

function featuredImage(listing: Listing): string | null {
  return (
    listing.images.find((image) => image.isPrimary)?.url ??
    listing.images[0]?.url ??
    null
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [featured, setFeatured] = useState<Listing[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const displayName = user?.fullName?.split(" ")[0] ?? user?.email ?? "there";
  const roles = (user?.roles ?? []).filter(
    (role) => role === "GUEST" || role === "HOST",
  );
  const isHost = roles.includes("HOST");
  const needsKyc = isHost && user?.kycStatus !== "APPROVED";

  const fetchBookings = useCallback(async (refreshing = false) => {
    if (refreshing) setIsRefreshing(true);
    try {
      // Featured listings ride along; both degrade gracefully — Browse and
      // the Bookings tab own the proper error states.
      const [bookingsRes, listingsRes] = await Promise.allSettled([
        bookingsApi.getAll(),
        listingsApi.getAll(),
      ]);
      if (bookingsRes.status === "fulfilled") {
        setBookings(bookingsRes.value.bookings);
      }
      if (listingsRes.status === "fulfilled") {
        setFeatured(listingsRes.value.listings.slice(0, FEATURED_SHOWN));
      }
    } finally {
      setBookingsLoaded(true);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings]),
  );

  const recentBookings = bookings.slice(0, RECENT_BOOKINGS_SHOWN);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchBookings(true)}
            tintColor={theme.colors.gold}
            colors={[theme.colors.gold]}
          />
        }
      >
        <Text style={styles.brand}>LENDA</Text>
        <Text style={styles.welcome}>Welcome, {displayName}</Text>
        <View style={styles.badgeRow}>
          {roles.map((role) => (
            <View key={role} style={styles.badge}>
              <Text style={styles.badgeText}>{role}</Text>
            </View>
          ))}
        </View>

        {needsKyc && (
          <Pressable
            style={styles.kycCard}
            onPress={() => router.push("/kyc-upload")}
          >
            <ShieldAlert
              size={theme.typography.size.xl}
              color={theme.colors.warning}
            />
            <View style={styles.kycCardBody}>
              <Text style={styles.kycCardTitle}>Finish verification</Text>
              <Text style={styles.kycCardText}>
                Upload your KYC documents to start listing on Lenda.
              </Text>
            </View>
            <ChevronRight
              size={theme.typography.size.base}
              color={theme.colors.mutedForeground}
            />
          </Pressable>
        )}

        <View style={styles.actionRow}>
          <Pressable
            style={styles.actionCard}
            onPress={() => router.push("/browse")}
          >
            <Search size={theme.typography.size.xl} color={theme.colors.gold} />
            <Text style={styles.actionLabel}>Browse listings</Text>
          </Pressable>
          {isHost && (
            <Pressable
              style={styles.actionCard}
              onPress={() => router.push("/my-listings")}
            >
              <ListChecks
                size={theme.typography.size.xl}
                color={theme.colors.gold}
              />
              <Text style={styles.actionLabel}>My listings</Text>
            </Pressable>
          )}
        </View>

        {featured.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured</Text>
              <Pressable onPress={() => router.push("/browse")} hitSlop={6}>
                <Text style={styles.sectionLink}>Browse all</Text>
              </Pressable>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={featured}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.featuredRow}
              renderItem={({ item }) => {
                const imageUrl = featuredImage(item);
                return (
                  <Pressable
                    style={styles.featuredCard}
                    onPress={() => router.push(`/listing/${item.id}`)}
                  >
                    {imageUrl ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.featuredImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[styles.featuredImage, styles.featuredEmpty]}
                      />
                    )}
                    <View style={styles.featuredBody}>
                      <Text style={styles.featuredTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.featuredPrice}>
                        {item.currency}{" "}
                        {Number(item.pricePerDay).toLocaleString()}/day
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          </>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent bookings</Text>
          {bookings.length > 0 && (
            <Pressable onPress={() => router.push("/bookings")} hitSlop={6}>
              <Text style={styles.sectionLink}>See all</Text>
            </Pressable>
          )}
        </View>

        {!bookingsLoaded ? (
          <Text style={styles.stateText}>Loading bookings...</Text>
        ) : recentBookings.length === 0 ? (
          <Text style={styles.stateText}>
            No bookings yet. Find something in Browse to get started.
          </Text>
        ) : (
          recentBookings.map((booking) => (
            <Pressable
              key={booking.id}
              style={styles.bookingRow}
              onPress={() => router.push(`/booking/${booking.id}`)}
            >
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingTitle} numberOfLines={1}>
                  {booking.listing.title}
                </Text>
                <Text style={styles.bookingDates}>
                  {formatDateRange(booking.startDate, booking.endDate)}
                </Text>
              </View>
              <BookingStatusBadge status={booking.status} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  brand: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.xxl,
    fontFamily: theme.typography.font.displayBlack,
    letterSpacing: theme.spacing.xs,
  },
  welcome: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.font.bodyMedium,
  },
  badgeRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  badge: {
    borderColor: theme.colors.gold,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  badgeText: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodySemibold,
  },
  kycCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.warning,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  kycCardBody: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  kycCardTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  kycCardText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  actionRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  actionCard: {
    flex: 1,
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  actionLabel: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  featuredRow: {
    gap: theme.spacing.md,
  },
  featuredCard: {
    width: theme.spacing.xxl * 4,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  featuredImage: {
    width: "100%",
    height: theme.spacing.xxl * 2 + theme.spacing.md,
  },
  featuredEmpty: {
    backgroundColor: theme.colors.muted,
  },
  featuredBody: {
    padding: theme.spacing.sm,
    gap: theme.spacing.xs / 2,
  },
  featuredTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodySemibold,
  },
  featuredPrice: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodySemibold,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
  },
  sectionLink: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  stateText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
  bookingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  bookingInfo: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  bookingTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  bookingDates: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
});
