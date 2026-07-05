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
import { ArrowLeft, BadgeCheck, MapPin } from "lucide-react-native";
import { theme } from "../../theme";
import { authApi, type PublicProfile } from "../../api/auth";
import { reviewsApi, type UserReview } from "../../api/reviews";
import { ApiError } from "../../api/client";
import { StarRating } from "../../components/StarRating";
import { ErrorState } from "../../components/ErrorState";
import { formatDate } from "../../lib/dates";

function initialsOf(name: string | null): string {
  return (name ?? "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function PublicProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [profileRes, reviewsRes] = await Promise.allSettled([
        authApi.getProfile(id),
        reviewsApi.getForUser(id),
      ]);
      if (profileRes.status === "rejected") throw profileRes.reason;
      setProfile(profileRes.value.user);
      setReviews(
        reviewsRes.status === "fulfilled" ? reviewsRes.value.reviews : [],
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load this profile. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) /
        reviews.length
      : null;

  const memberSince = profile
    ? new Date(profile.createdAt).getFullYear()
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
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>Loading profile...</Text>
        </View>
      ) : error || !profile ? (
        <ErrorState
          message={error ?? "Profile not found."}
          onRetry={fetchProfile}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.identity}>
            {profile.photoUrl ? (
              <Image
                source={{ uri: profile.photoUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitials}>
                  {initialsOf(profile.fullName)}
                </Text>
              </View>
            )}
            <Text style={styles.name}>
              {profile.fullName ?? "Lenda member"}
            </Text>
            {profile.kycStatus === "APPROVED" && (
              <View style={styles.verifiedRow}>
                <BadgeCheck
                  size={theme.typography.size.sm}
                  color={theme.colors.success}
                />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
            <View style={styles.metaRow}>
              {profile.location && (
                <View style={styles.metaItem}>
                  <MapPin
                    size={theme.typography.size.xs}
                    color={theme.colors.mutedForeground}
                  />
                  <Text style={styles.metaText}>{profile.location}</Text>
                </View>
              )}
              {memberSince && (
                <Text style={styles.metaText}>Member since {memberSince}</Text>
              )}
            </View>
            {avgRating !== null && (
              <View style={styles.ratingRow}>
                <StarRating
                  rating={Math.round(avgRating)}
                  size={theme.typography.size.sm}
                />
                <Text style={styles.metaText}>
                  {avgRating.toFixed(1)} ({reviews.length}{" "}
                  {reviews.length === 1 ? "review" : "reviews"})
                </Text>
              </View>
            )}
            {profile.badges.length > 0 && (
              <View style={styles.badgeRow}>
                {profile.badges.map((badge) => (
                  <View key={badge.id} style={styles.badge}>
                    <Text style={styles.badgeText}>{badge.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          {profile.portfolioImages.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Portfolio</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.portfolioRow}
              >
                {profile.portfolioImages.map((image) => (
                  <Image
                    key={image.id}
                    source={{ uri: image.url }}
                    style={styles.portfolioImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            </>
          )}

          {reviews.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Reviews</Text>
              {reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewName} numberOfLines={1}>
                      {review.reviewer.fullName ?? "Lenda member"}
                    </Text>
                    <StarRating
                      rating={review.rating}
                      size={theme.typography.size.xs}
                    />
                  </View>
                  <Text style={styles.reviewListing} numberOfLines={1}>
                    {review.booking.listing.title}
                  </Text>
                  {review.comment && (
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  )}
                  <Text style={styles.reviewDate}>
                    {formatDate(review.createdAt)}
                  </Text>
                </View>
              ))}
            </>
          )}
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
  identity: {
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  avatar: {
    width: theme.spacing.xxl * 2,
    height: theme.spacing.xxl * 2,
    borderRadius: theme.radius.pill,
  },
  avatarFallback: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.gold,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.xxl,
    fontFamily: theme.typography.font.displayBold,
  },
  name: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.font.displayBold,
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  verifiedText: {
    color: theme.colors.success,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyMedium,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  metaText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    justifyContent: "center",
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
  bio: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
    lineHeight: theme.typography.size.lg,
    textAlign: "center",
  },
  sectionTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
    marginTop: theme.spacing.sm,
  },
  portfolioRow: {
    gap: theme.spacing.sm,
  },
  portfolioImage: {
    width: theme.spacing.xxl * 3,
    height: theme.spacing.xxl * 2,
    borderRadius: theme.radius.md,
  },
  reviewCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  reviewName: {
    flexShrink: 1,
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  reviewListing: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyMedium,
  },
  reviewComment: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
    lineHeight: theme.typography.size.lg,
  },
  reviewDate: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
});
