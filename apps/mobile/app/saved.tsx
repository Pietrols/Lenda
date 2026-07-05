import { useCallback, useState } from "react";
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
import { useFocusEffect, useRouter } from "expo-router";
import { ArrowLeft, Heart, ImageOff } from "lucide-react-native";
import { theme } from "../theme";
import { likesApi, type MyLike } from "../api/likes";
import { ApiError } from "../api/client";
import { ErrorState } from "../components/ErrorState";
import { RowCardSkeleton } from "../components/Skeleton";

export default function SavedScreen() {
  const router = useRouter();

  const [likes, setLikes] = useState<MyLike[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLikes = useCallback(async (refreshing = false) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const res = await likesApi.getMyListings();
      setLikes(res.likes);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load your saved listings. Please try again.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchLikes();
    }, [fetchLikes]),
  );

  const unlike = async (targetId: string) => {
    // Optimistic removal; the list refetches on next focus anyway.
    setLikes((prev) => prev.filter((like) => like.targetId !== targetId));
    likesApi.toggle(targetId).catch(() => fetchLikes());
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft
            size={theme.typography.size.xxl}
            color={theme.colors.foreground}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Saved Listings</Text>
      </View>

      {isLoading ? (
        <View style={styles.listContent}>
          <RowCardSkeleton />
          <RowCardSkeleton />
          <RowCardSkeleton />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchLikes()} />
      ) : (
        <FlatList
          data={likes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const imageUrl = item.listing.images[0]?.url ?? null;
            return (
              <Pressable
                style={styles.card}
                onPress={() => router.push(`/listing/${item.targetId}`)}
              >
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
                    {item.listing.title}
                  </Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {item.listing.location}
                  </Text>
                  <Text style={styles.cardPrice}>
                    {item.listing.currency}{" "}
                    {Number(item.listing.pricePerDay).toLocaleString()}/day
                  </Text>
                </View>
                <Pressable
                  onPress={() => unlike(item.targetId)}
                  hitSlop={8}
                  style={styles.unlikeButton}
                >
                  <Heart
                    size={theme.typography.size.base}
                    color={theme.colors.gold}
                    fill={theme.colors.gold}
                  />
                </Pressable>
              </Pressable>
            );
          }}
          contentContainerStyle={
            likes.length === 0 ? styles.centerContent : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Heart
                size={theme.typography.size.xxl}
                color={theme.colors.mutedForeground}
              />
              <Text style={styles.stateText}>
                Nothing saved yet. Tap the heart on any listing to keep it
                here.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchLikes(true)}
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
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  centerContent: {
    flexGrow: 1,
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
  empty: {
    alignItems: "center",
    gap: theme.spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  cardImage: {
    width: theme.spacing.xxl * 2,
    height: theme.spacing.xxl * 2,
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
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  cardMeta: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  cardPrice: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  unlikeButton: {
    paddingHorizontal: theme.spacing.md,
  },
});
