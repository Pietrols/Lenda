import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  BadgeCheck,
  Heart,
  ImageOff,
  MapPin,
  Navigation,
  Share2,
  Truck,
  X,
} from "lucide-react-native";
import { CreateBookingSchema } from "@lenda/schemas";
import { theme } from "../../theme";
import { listingsApi, type ListingDetail } from "../../api/listings";
import { bookingsApi, type Booking } from "../../api/bookings";
import { reviewsApi, type ListingReview } from "../../api/reviews";
import { likesApi } from "../../api/likes";
import { ApiError, SessionExpiredError } from "../../api/client";
import { StarRating } from "../../components/StarRating";
import { CalendarRange } from "../../components/CalendarRange";
import { ErrorState } from "../../components/ErrorState";
import { formatDate } from "../../lib/dates";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type PickupType = "CLIENT_TO_HOST" | "HOST_TO_CLIENT";

const pickupOptions: {
  value: PickupType;
  label: string;
  description: string;
  icon: typeof Navigation;
}[] = [
  {
    value: "CLIENT_TO_HOST",
    label: "I'll pick up",
    description: "Collect from the host",
    icon: Navigation,
  },
  {
    value: "HOST_TO_CLIENT",
    label: "Host delivers",
    description: "Delivered to you",
    icon: Truck,
  },
];

function hostInitials(name: string | null): string {
  return (name ?? "H")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function atUtcMorning(date: Date): string {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 8, 0, 0),
  ).toISOString();
}

function daysAfterToday(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function daysBetween(start: Date, end: Date): number {
  return Math.round(
    (Date.parse(atUtcMorning(end)) - Date.parse(atUtcMorning(start))) /
      MS_PER_DAY,
  );
}

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [reviews, setReviews] = useState<ListingReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    likesApi
      .getCount(id)
      .then((res) => {
        if (!cancelled) setLikeCount(res.count);
      })
      .catch(() => {});
    likesApi
      .getMyListings()
      .then((res) => {
        if (!cancelled) {
          setLiked(res.likes.some((like) => like.targetId === id));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  const toggleLike = async () => {
    if (!id) return;
    // Optimistic flip; revert on failure.
    const next = !liked;
    setLiked(next);
    setLikeCount((count) => Math.max(0, count + (next ? 1 : -1)));
    try {
      const res = await likesApi.toggle(id);
      setLiked(res.liked);
    } catch {
      setLiked(!next);
      setLikeCount((count) => Math.max(0, count + (next ? -1 : 1)));
    }
  };

  const [bookingOpen, setBookingOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>(() => daysAfterToday(1));
  const [endDate, setEndDate] = useState<Date | null>(() => daysAfterToday(2));
  const [pickupType, setPickupType] = useState<PickupType>("CLIENT_TO_HOST");
  const [notes, setNotes] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);

  const fetchListing = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      // Reviews load alongside the listing but are non-critical: if they fail
      // the listing still renders, just without a reviews section.
      const [listingRes, reviewsRes] = await Promise.allSettled([
        listingsApi.getById(id),
        reviewsApi.getForListing(id),
      ]);
      if (listingRes.status === "rejected") throw listingRes.reason;
      setListing(listingRes.value.listing);
      setReviews(
        reviewsRes.status === "fulfilled" ? reviewsRes.value.reviews : [],
      );
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
        (a, b) =>
          Number(b.isPrimary) - Number(a.isPrimary) || a.order - b.order,
      )
    : [];

  const isNegotiableListing = listing?.pricingMode === "NEGOTIABLE";

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) /
        reviews.length
      : null;

  const totalDays = endDate ? daysBetween(startDate, endDate) : 0;
  const dateOrderValid = totalDays > 0;
  // Mirrors the server's pricing: the delivery fee is added only on
  // fixed-price bookings where the host delivers to the guest.
  const deliveryFee =
    listing &&
    !isNegotiableListing &&
    pickupType === "HOST_TO_CLIENT" &&
    listing.deliveryFee !== null
      ? Number(listing.deliveryFee)
      : 0;
  const totalAmount = listing
    ? Math.max(totalDays, 0) * Number(listing.pricePerDay) + deliveryFee
    : 0;

  const openBooking = () => {
    setStartDate(daysAfterToday(1));
    setEndDate(daysAfterToday(2));
    setPickupType("CLIENT_TO_HOST");
    setNotes("");
    setBudgetMin("");
    setBudgetMax("");
    setFormError(null);
    setCreatedBooking(null);
    setBookingOpen(true);
  };

  const submitBooking = async () => {
    if (!listing || !dateOrderValid || !endDate) return;
    setFormError(null);

    if (isNegotiableListing) {
      if (!budgetMax.trim() || Number(budgetMax) <= 0) {
        setFormError("Please enter your offer.");
        return;
      }
      if (
        budgetMin.trim() &&
        Number(budgetMin) > Number(budgetMax)
      ) {
        setFormError("Minimum budget cannot exceed your offer.");
        return;
      }
    }

    const parsed = CreateBookingSchema.safeParse({
      listingId: listing.id,
      startDate: atUtcMorning(startDate),
      endDate: atUtcMorning(endDate),
      pickupType,
      notes: notes.trim() || undefined,
      ...(isNegotiableListing
        ? {
            isNegotiable: true,
            budgetMax: Number(budgetMax),
            ...(budgetMin.trim() ? { budgetMin: Number(budgetMin) } : {}),
          }
        : {}),
    });

    if (!parsed.success) {
      setFormError(
        parsed.error.issues[0]?.message ?? "Please check the booking details.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await bookingsApi.create(parsed.data);
      setCreatedBooking(res.booking);
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        setFormError("Your session expired. Please sign in again.");
      } else if (err instanceof ApiError) {
        if (err.status === 409) {
          setFormError(
            "This listing is already booked for those dates. Please choose different dates.",
          );
        } else if (
          err.status === 400 &&
          /own listing/i.test(err.message)
        ) {
          setFormError("You cannot book your own listing.");
        } else if (
          err.status === 400 &&
          /(end ?date|start ?date|after)/i.test(err.message)
        ) {
          setFormError("End date must be after start date.");
        } else {
          setFormError(err.message);
        }
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft
              size={theme.typography.size.xxl}
              color={theme.colors.foreground}
            />
          </Pressable>
          <Text style={styles.headerTitle}>Listing</Text>
        </View>
        {listing && (
          <View style={styles.headerActions}>
            <Pressable onPress={toggleLike} hitSlop={8}>
              <View style={styles.likeWrap}>
                <Heart
                  size={theme.typography.size.xl}
                  color={liked ? theme.colors.gold : theme.colors.mutedForeground}
                  fill={liked ? theme.colors.gold : "transparent"}
                />
                {likeCount > 0 && (
                  <Text style={styles.likeCount}>{likeCount}</Text>
                )}
              </View>
            </Pressable>
            <Pressable
              onPress={() =>
                Share.share({
                  message: `${listing.title} on Lenda - https://lenda.work/listings/${listing.id}`,
                }).catch(() => {})
              }
              hitSlop={8}
            >
              <Share2
                size={theme.typography.size.xl}
                color={theme.colors.gold}
              />
            </Pressable>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>Loading listing...</Text>
        </View>
      ) : error || !listing ? (
        <ErrorState
          message={error ?? "Listing not found."}
          onRetry={fetchListing}
        />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {sortedImages.length > 0 ? (
              <View>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) =>
                    setActiveImage(
                      Math.round(e.nativeEvent.contentOffset.x / width),
                    )
                  }
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
                {sortedImages.length > 1 && (
                  <View style={styles.dotsRow}>
                    {sortedImages.map((image, index) => (
                      <View
                        key={image.id}
                        style={[
                          styles.dot,
                          index === activeImage && styles.dotActive,
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
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

              {avgRating !== null && (
                <View style={styles.ratingSummary}>
                  <StarRating
                    rating={Math.round(avgRating)}
                    size={theme.typography.size.sm}
                  />
                  <Text style={styles.ratingSummaryText}>
                    {avgRating.toFixed(1)} ({reviews.length}{" "}
                    {reviews.length === 1 ? "review" : "reviews"})
                  </Text>
                </View>
              )}

              <Text style={styles.price}>
                {listing.currency}{" "}
                {Number(listing.pricePerDay).toLocaleString()}
                <Text style={styles.priceUnit}>/day</Text>
              </Text>

              <Text style={styles.description}>{listing.description}</Text>

              <Pressable
                style={styles.hostCard}
                onPress={() => router.push(`/user/${listing.host.id}`)}
              >
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
              </Pressable>

              {reviews.length > 0 && (
                <>
                  <Text style={styles.reviewsTitle}>Reviews</Text>
                  {reviews.map((review) => (
                    <View key={review.id} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        {review.reviewer.photoUrl ? (
                          <Image
                            source={{ uri: review.reviewer.photoUrl }}
                            style={styles.reviewAvatar}
                          />
                        ) : (
                          <View
                            style={[
                              styles.reviewAvatar,
                              styles.reviewAvatarFallback,
                            ]}
                          >
                            <Text style={styles.reviewInitials}>
                              {hostInitials(review.reviewer.fullName)}
                            </Text>
                          </View>
                        )}
                        <View style={styles.reviewHeaderInfo}>
                          <Text style={styles.reviewName} numberOfLines={1}>
                            {review.reviewer.fullName ?? "Lenda guest"}
                          </Text>
                          <StarRating
                            rating={review.rating}
                            size={theme.typography.size.xs}
                          />
                        </View>
                      </View>
                      {review.comment && (
                        <Text style={styles.reviewComment}>
                          {review.comment}
                        </Text>
                      )}
                      <Text style={styles.reviewDate}>
                        {formatDate(review.createdAt)}
                      </Text>
                    </View>
                  ))}
                </>
              )}
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
            <Pressable style={styles.bookButton} onPress={openBooking}>
              <Text style={styles.bookButtonText}>Book Now</Text>
            </Pressable>
          </View>

          <Modal
            visible={bookingOpen}
            animationType="slide"
            transparent
            onRequestClose={() => setBookingOpen(false)}
          >
            <View style={styles.modalOverlay}>
              <KeyboardAvoidingView
                style={styles.modalAvoider}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
              >
                <View style={styles.modalSheet}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      {createdBooking ? "Booking requested" : "Book this listing"}
                    </Text>
                    <Pressable
                      onPress={() => setBookingOpen(false)}
                      hitSlop={8}
                    >
                      <X
                        size={theme.typography.size.xl}
                        color={theme.colors.mutedForeground}
                      />
                    </Pressable>
                  </View>

                  {createdBooking ? (
                    <View style={styles.confirmation}>
                      <BadgeCheck
                        size={theme.typography.size.display}
                        color={theme.colors.success}
                      />
                      <View style={styles.statusPill}>
                        <Text style={styles.statusPillText}>
                          {createdBooking.status}
                        </Text>
                      </View>
                      <Text style={styles.confirmationText}>
                        Your request for {createdBooking.totalDays}{" "}
                        {createdBooking.totalDays === 1 ? "day" : "days"} has
                        been sent to the host.
                      </Text>
                      <Text style={styles.confirmationTotal}>
                        Total: {createdBooking.currency}{" "}
                        {Number(createdBooking.totalAmount).toLocaleString()}
                      </Text>
                      <Pressable
                        style={[styles.submitButton, styles.submitFullWidth]}
                        onPress={() => {
                          setBookingOpen(false);
                          router.replace("/(tabs)/browse");
                        }}
                      >
                        <Text style={styles.submitText}>Back to Browse</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <ScrollView
                      contentContainerStyle={styles.formContent}
                      keyboardShouldPersistTaps="handled"
                    >
                      <View style={styles.field}>
                        <Text style={styles.formLabel}>Dates</Text>
                        <CalendarRange
                          start={startDate}
                          end={endDate}
                          minimumDate={new Date()}
                          onChange={(nextStart, nextEnd) => {
                            setStartDate(nextStart);
                            setEndDate(nextEnd);
                          }}
                        />
                      </View>
                      {!dateOrderValid && (
                        <Text style={styles.offerHint}>
                          Tap a start date, then an end date, to see the
                          total.
                        </Text>
                      )}

                      <View style={styles.field}>
                        <Text style={styles.formLabel}>Pickup</Text>
                        <View style={styles.pickupGrid}>
                          {pickupOptions.map((option) => {
                            const Icon = option.icon;
                            const selected = pickupType === option.value;
                            return (
                              <Pressable
                                key={option.value}
                                onPress={() => setPickupType(option.value)}
                                style={[
                                  styles.pickupCard,
                                  selected && styles.pickupCardSelected,
                                ]}
                              >
                                <Icon
                                  size={theme.typography.size.xl}
                                  color={theme.colors.gold}
                                />
                                <Text style={styles.pickupLabel}>
                                  {option.label}
                                </Text>
                                <Text style={styles.pickupDescription}>
                                  {option.description}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>

                      {isNegotiableListing && (
                        <View style={styles.field}>
                          <Text style={styles.formLabel}>
                            Your offer ({listing.currency}, total)
                          </Text>
                          <TextInput
                            value={budgetMax}
                            onChangeText={setBudgetMax}
                            placeholder="e.g. 300"
                            placeholderTextColor={theme.colors.mutedForeground}
                            keyboardType="numeric"
                            style={styles.offerInput}
                          />
                          <Text style={styles.formLabel}>
                            Minimum budget (optional)
                          </Text>
                          <TextInput
                            value={budgetMin}
                            onChangeText={setBudgetMin}
                            placeholder="e.g. 100"
                            placeholderTextColor={theme.colors.mutedForeground}
                            keyboardType="numeric"
                            style={styles.offerInput}
                          />
                          <Text style={styles.offerHint}>
                            This host accepts offers. Your offer opens a
                            negotiation - the host can accept or counter within
                            2 hours.
                          </Text>
                        </View>
                      )}

                      <View style={styles.field}>
                        <Text style={styles.formLabel}>Notes (optional)</Text>
                        <TextInput
                          value={notes}
                          onChangeText={setNotes}
                          placeholder="Anything the host should know?"
                          placeholderTextColor={theme.colors.mutedForeground}
                          multiline
                          numberOfLines={3}
                          style={styles.notesInput}
                        />
                      </View>

                      {deliveryFee > 0 && (
                        <View style={styles.totalRow}>
                          <Text style={styles.totalLabel}>Delivery fee</Text>
                          <Text style={styles.totalLabel}>
                            {listing.currency} {deliveryFee.toLocaleString()}
                          </Text>
                        </View>
                      )}

                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>
                          {isNegotiableListing
                            ? "Your offer"
                            : dateOrderValid
                              ? `${totalDays} ${totalDays === 1 ? "day" : "days"} x ${
                                  listing.currency
                                } ${Number(listing.pricePerDay).toLocaleString()}`
                              : "Total"}
                        </Text>
                        <Text style={styles.totalValue}>
                          {listing.currency}{" "}
                          {isNegotiableListing
                            ? budgetMax.trim() && Number(budgetMax) > 0
                              ? Number(budgetMax).toLocaleString()
                              : "--"
                            : dateOrderValid
                              ? totalAmount.toLocaleString()
                              : "--"}
                        </Text>
                      </View>

                      {formError && (
                        <View style={styles.formErrorBox}>
                          <Text style={styles.formErrorText}>{formError}</Text>
                        </View>
                      )}

                      <Pressable
                        style={[
                          styles.submitButton,
                          (isSubmitting || !dateOrderValid) &&
                            styles.submitButtonDisabled,
                        ]}
                        onPress={submitBooking}
                        disabled={isSubmitting || !dateOrderValid}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator
                            color={theme.colors.primaryForeground}
                          />
                        ) : (
                          <Text style={styles.submitText}>
                            Request booking
                          </Text>
                        )}
                      </Pressable>
                    </ScrollView>
                  )}
                </View>
              </KeyboardAvoidingView>
            </View>
          </Modal>
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
    justifyContent: "space-between",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.lg,
  },
  likeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  likeCount: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodySemibold,
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
  dotsRow: {
    position: "absolute",
    bottom: theme.spacing.sm,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.spacing.xs,
  },
  dot: {
    width: theme.spacing.sm,
    height: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.dotInactive,
  },
  dotActive: {
    backgroundColor: theme.colors.gold,
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
  ratingSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  ratingSummaryText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyMedium,
  },
  reviewsTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
    marginTop: theme.spacing.md,
  },
  reviewCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  reviewAvatar: {
    width: theme.spacing.xl,
    height: theme.spacing.xl,
    borderRadius: theme.radius.pill,
  },
  reviewAvatarFallback: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.gold,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewInitials: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.displayBold,
  },
  reviewHeaderInfo: {
    flex: 1,
    gap: theme.spacing.xs / 2,
  },
  reviewName: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
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
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: theme.colors.scrim,
  },
  modalAvoider: {
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    paddingBottom: theme.spacing.xl,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.lg,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
  },
  modalTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
  },
  formContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  field: {
    gap: theme.spacing.xs,
  },
  formLabel: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyMedium,
  },
  pickupGrid: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  pickupCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  pickupCardSelected: {
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.goldTint,
  },
  pickupLabel: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
    marginTop: theme.spacing.xs,
  },
  pickupDescription: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  offerInput: {
    height: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
  offerHint: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  notesInput: {
    minHeight: theme.spacing.xxl + theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
    textAlignVertical: "top",
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
  },
  totalLabel: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
  totalValue: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.font.displayBold,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  formErrorBox: {
    backgroundColor: theme.colors.errorTint,
    borderColor: theme.colors.error,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
  },
  formErrorText: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: theme.spacing.xxl,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    marginTop: theme.spacing.xs,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.bodySemibold,
  },
  confirmation: {
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  statusPill: {
    borderColor: theme.colors.warning,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  statusPillText: {
    color: theme.colors.warning,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodySemibold,
  },
  confirmationText: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
    textAlign: "center",
  },
  confirmationTotal: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.font.displayBold,
  },
  submitFullWidth: {
    alignSelf: "stretch",
  },
});
