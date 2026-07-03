import { useCallback, useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, BadgeCheck, ImageOff, MapPin } from "lucide-react-native";
import { theme } from "../../theme";
import { listingsApi, type ListingDetail } from "../../api/listings";
import { ApiError } from "../../api/client";

function hostInitials(name: string | null): string {
  return (name ?? "H")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchListing = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await listingsApi.getById(id);
      setListing(res.listing);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load this listing. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  const sortedImages = listing
    ? [...listing.images].sort(
        (a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.order - b.order,
      )
    : [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft
            size={theme.typography.size.xxl}
            color={theme.colors.foreground}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Listing</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>Loading listing...</Text>
        </View>
      ) : error || !listing ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>
            {error ?? "Listing not found."}
          </Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {sortedImages.length > 0 ? (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
              >
                {sortedImages.map((image) => (
                  <Image
                    key={image.id}
                    source={{ uri: image.url }}
                    style={[styles.image, { width }]}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={[styles.image, styles.imagePlaceholder, { width }]}>
                <ImageOff
                  size={theme.typography.size.display}
                  color={theme.colors.mutedForeground}
                />
              </View>
            )}

            <View style={styles.body}>
              <Text style={styles.title}>{listing.title}</Text>

              <View style={styles.metaRow}>
                <MapPin
                  size={theme.typography.size.sm}
                  color={theme.colors.mutedForeground}
                />
                <Text style={styles.metaText}>{listing.location}</Text>
              </View>

              <Text style={styles.category}>
                {listing.category}
                {listing.subcategory ? ` / ${listing.subcategory}` : ""}
              </Text>

              <Text style={styles.price}>
                {listing.currency}{" "}
                {Number(listing.pricePerDay).toLocaleString()}
                <Text style={styles.priceUnit}>/day</Text>
              </Text>

              <Text style={styles.description}>{listing.description}</Text>

              <View style={styles.hostCard}>
                {listing.host.photoUrl ? (
                  <Image
                    source={{ uri: listing.host.photoUrl }}
                    style={styles.hostAvatar}
                  />
                ) : (
                  <View style={[styles.hostAvatar, styles.hostAvatarFallback]}>
                    <Text style={styles.hostInitials}>
                      {hostInitials(listing.host.fullName)}
                    </Text>
                  </View>
                )}
                <View style={styles.hostInfo}>
                  <Text style={styles.hostName}>
                    {listing.host.fullName ?? "Host"}
                  </Text>
                  {listing.host.kycStatus === "APPROVED" && (
                    <View style={styles.kycBadge}>
                      <BadgeCheck
                        size={theme.typography.size.sm}
                        color={theme.colors.success}
                      />
                      <Text style={styles.kycText}>Verified host</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.bottomBar}>
            <View>
              <Text style={styles.bottomPrice}>
                {listing.currency}{" "}
                {Number(listing.pricePerDay).toLocaleString()}
              </Text>
              <Text style={styles.bottomPriceUnit}>per day</Text>
            </View>
            <Pressable style={styles.bookButton}>
              <Text style={styles.bookButtonText}>Book Now</Text>
            </Pressable>
          </View>
        </>
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
    paddingBottom: theme.spacing.xxl * 2,
  },
  image: {
    height: theme.spacing.xxl * 5,
  },
  imagePlaceholder: {
    backgroundColor: theme.colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.xxl,
    fontFamily: theme.typography.font.displayBold,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  metaText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
  category: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyMedium,
    textTransform: "uppercase",
  },
  price: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.xxl,
    fontFamily: theme.typography.font.displayBold,
    marginTop: theme.spacing.xs,
  },
  priceUnit: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
  description: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
    lineHeight: theme.typography.size.xl,
    marginTop: theme.spacing.sm,
  },
  hostCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  hostAvatar: {
    width: theme.spacing.xxl,
    height: theme.spacing.xxl,
    borderRadius: theme.radius.pill,
  },
  hostAvatarFallback: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.gold,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  hostInitials: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.displayBold,
  },
  hostInfo: {
    gap: theme.spacing.xs,
  },
  hostName: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.bodySemibold,
  },
  kycBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  kycText: {
    color: theme.colors.success,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyMedium,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    backgroundColor: theme.colors.card,
  },
  bottomPrice: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.font.displayBold,
  },
  bottomPriceUnit: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  bookButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.xl,
    height: theme.spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
  },
  bookButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.bodySemibold,
  },
});
