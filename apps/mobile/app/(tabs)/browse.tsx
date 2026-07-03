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
import { ImageOff, MapPin } from "lucide-react-native";
import { theme } from "../../theme";
import {
  listingsApi,
  type Listing,
  type ListingPillar,
} from "../../api/listings";
import { ApiError } from "../../api/client";

const pillarFilters: { label: string; value: ListingPillar | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Rentals", value: "RENTAL" },
  { label: "Services", value: "SERVICE" },
];

function primaryImageUrl(listing: Listing): string | null {
  return (
    listing.images.find((image) => image.isPrimary)?.url ??
    listing.images[0]?.url ??
    null
  );
}

function formatPrice(listing: Listing): string {
  return `${listing.currency} ${Number(listing.pricePerDay).toLocaleString()}/day`;
}

function ListingCard({
  listing,
  onPress,
}: {
  listing: Listing;
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
            size={theme.typography.size.xxl}
            color={theme.colors.mutedForeground}
          />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {listing.title}
        </Text>
        <View style={styles.metaRow}>
          <MapPin
            size={theme.typography.size.xs}
            color={theme.colors.mutedForeground}
          />
          <Text style={styles.metaText} numberOfLines={1}>
            {listing.location}
          </Text>
        </View>
        <Text style={styles.category}>{listing.category}</Text>
        <Text style={styles.price}>{formatPrice(listing)}</Text>
      </View>
    </Pressable>
  );
}

export default function BrowseScreen() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pillar, setPillar] = useState<ListingPillar | undefined>(undefined);

  const fetchListings = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      try {
        const res = await listingsApi.getAll({ pillar });
        setListings(res.listings);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load listings. Please try again.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [pillar],
  );

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Browse</Text>
      </View>

      <View style={styles.filterRow}>
        {pillarFilters.map((filter) => {
          const isActive = pillar === filter.value;
          return (
            <Pressable
              key={filter.label}
              onPress={() => setPillar(filter.value)}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
            >
              <Text
                style={[
                  styles.filterText,
                  isActive && styles.filterTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
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
            <Text style={styles.stateText}>No listings yet.</Text>
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
  filterPillActive: {
    backgroundColor: theme.colors.gold,
    borderColor: theme.colors.gold,
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
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: theme.spacing.xxl * 4,
  },
  imagePlaceholder: {
    backgroundColor: theme.colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  cardTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.bodySemibold,
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
    marginTop: theme.spacing.xs,
  },
});
