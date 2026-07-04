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
import { ArrowLeft, ImageOff } from "lucide-react-native";
import { theme } from "../theme";
import { listingsApi, type MyListing } from "../api/listings";
import { ApiError } from "../api/client";
import { useAuthStore } from "../store/auth.store";
import { ListingStatusBadge } from "../components/ListingStatusBadge";

function primaryImageUrl(listing: MyListing): string | null {
  return (
    listing.images.find((image) => image.isPrimary)?.url ??
    listing.images[0]?.url ??
    null
  );
}

function ListingCard({
  listing,
  onPress,
}: {
  listing: MyListing;
  onPress: () => void;
}) {
  const imageUrl = primaryImageUrl(listing);

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
          {listing.title}
        </Text>
        <ListingStatusBadge status={listing.status} />
        <Text style={styles.category}>{listing.category}</Text>
        <Text style={styles.price}>
          {listing.currency} {Number(listing.pricePerDay).toLocaleString()}/day
        </Text>
      </View>
    </Pressable>
  );
}

export default function MyListingsScreen() {
  const router = useRouter();
  const roles = useAuthStore((s) => s.user?.roles ?? []);
  const isHost = roles.includes("HOST");

  const [listings, setListings] = useState<MyListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = useCallback(
    async (refreshing = false) => {
      if (!isHost) return;
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      try {
        const res = await listingsApi.getMine();
        setListings(res.listings);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load your listings. Please try again.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [isHost],
  );

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft
            size={theme.typography.size.xxl}
            color={theme.colors.foreground}
          />
        </Pressable>
        <Text style={styles.headerTitle}>My Listings</Text>
      </View>

      {!isHost ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>
            Only hosts can manage listings. Become a host to start listing on
            Lenda.
          </Text>
        </View>
      ) : isLoading ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>Loading listings...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              onPress={() => router.push(`/listing/${item.id}`)}
            />
          )}
          contentContainerStyle={
            listings.length === 0 ? styles.centerContent : styles.listContent
          }
          ListEmptyComponent={
            <Text style={styles.stateText}>
              You have no listings yet.
            </Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchListings(true)}
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
  category: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyMedium,
    textTransform: "uppercase",
  },
  price: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
});
