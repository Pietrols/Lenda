import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Circle,
  CircleCheck,
  ImageOff,
  MapPin,
  MessageCircle,
} from "lucide-react-native";
import { CreateReviewSchema } from "@lenda/schemas";
import { theme } from "../../theme";
import {
  bookingsApi,
  type BookingDetail,
  type BookingHistoryEntry,
  type BookingStatus,
  type HandoverType,
} from "../../api/bookings";
import { reviewsApi, type Review } from "../../api/reviews";
import { ApiError } from "../../api/client";
import { useAuthStore } from "../../store/auth.store";
import { BookingStatusBadge } from "../../components/BookingStatusBadge";
import { StarRating } from "../../components/StarRating";
import { ErrorState } from "../../components/ErrorState";
import { formatDate, formatDateRange } from "../../lib/dates";

const pickupLabels: Record<BookingDetail["pickupType"], string> = {
  CLIENT_TO_HOST: "Pick up from host",
  HOST_TO_CLIENT: "Host delivers",
};

// Next progression step available to either party, mirroring the server's
// transition maps in booking-service (RENTAL goes through the handover states;
// SERVICE skips handover entirely). HANDED_OVER -> ACTIVE and RETURN_PENDING ->
// COMPLETED are NOT listed here: those advance automatically once both parties
// confirm the handover, never via a direct status button.
const progressionSteps: Record<
  "RENTAL" | "SERVICE",
  Partial<Record<BookingStatus, { to: BookingStatus; label: string }>>
> = {
  RENTAL: {
    CONFIRMED: { to: "EN_ROUTE", label: "Mark as en route" },
    EN_ROUTE: { to: "HANDED_OVER", label: "Mark as handed over" },
    ACTIVE: { to: "RETURN_PENDING", label: "Start return" },
  },
  SERVICE: {
    CONFIRMED: { to: "ACTIVE", label: "Start service" },
    ACTIVE: { to: "COMPLETED", label: "Mark as completed" },
  },
};

// Which handover the current status is waiting on (RENTAL only).
const handoverForStatus: Partial<Record<BookingStatus, HandoverType>> = {
  HANDED_OVER: "PICKUP",
  RETURN_PENDING: "RETURN",
};

// Statuses from which either party may leave a review, per the server's
// review.service rules: rentals once handover has occurred, services once
// active. One review per party per booking.
const reviewableStatuses: Record<"RENTAL" | "SERVICE", BookingStatus[]> = {
  RENTAL: ["HANDED_OVER", "ACTIVE", "RETURN_PENDING", "RETURNED", "COMPLETED"],
  SERVICE: ["ACTIVE", "COMPLETED"],
};

// Statuses from which either party may raise a dispute, per the server's
// transition maps. Disputes freeze the booking for admin review.
const disputableStatuses: Record<"RENTAL" | "SERVICE", BookingStatus[]> = {
  RENTAL: ["EN_ROUTE", "HANDED_OVER", "ACTIVE", "RETURN_PENDING"],
  SERVICE: ["ACTIVE"],
};

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
        <Text style={styles.timelineTime}>{formatDate(entry.createdAt)}</Text>
      </View>
    </View>
  );
}

export default function BookingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [declineMode, setDeclineMode] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [counterAmount, setCounterAmount] = useState("");
  const [negotiationLoading, setNegotiationLoading] = useState<
    "ACCEPT" | "COUNTER" | null
  >(null);
  const [negotiationError, setNegotiationError] = useState<string | null>(
    null,
  );
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [reviewChecked, setReviewChecked] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<
    "CONFIRM" | "DECLINE" | "PROGRESS" | "HANDOVER" | "CANCEL" | "DISPUTE" | null
  >(null);
  const [cancelMode, setCancelMode] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [disputeMode, setDisputeMode] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

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

  const runTransition = async (
    status: BookingStatus,
    loadingKey: "CONFIRM" | "DECLINE" | "PROGRESS" | "CANCEL" | "DISPUTE",
    reason?: string,
  ) => {
    if (!id) return;
    setActionError(null);
    setActionLoading(loadingKey);
    try {
      await bookingsApi.updateStatus(id, status, reason);
      setDeclineMode(false);
      setDeclineReason("");
      setCancelMode(false);
      setCancelReason("");
      setDisputeMode(false);
      setDisputeReason("");
      await fetchBooking();
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Could not update the booking. Please try again.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const runAcceptOffer = async () => {
    if (!id) return;
    setNegotiationError(null);
    setNegotiationLoading("ACCEPT");
    try {
      await bookingsApi.acceptOffer(id);
      await fetchBooking();
    } catch (err) {
      setNegotiationError(
        err instanceof ApiError
          ? err.message
          : "Could not accept the offer. Please try again.",
      );
    } finally {
      setNegotiationLoading(null);
    }
  };

  const runCounter = async () => {
    if (!id) return;
    const amount = Number(counterAmount);
    if (!counterAmount.trim() || Number.isNaN(amount) || amount <= 0) {
      setNegotiationError("Please enter a valid counter amount.");
      return;
    }
    setNegotiationError(null);
    setNegotiationLoading("COUNTER");
    try {
      await bookingsApi.submitCounter(id, amount);
      setCounterAmount("");
      await fetchBooking();
    } catch (err) {
      setNegotiationError(
        err instanceof ApiError
          ? err.message
          : "Could not send your counter. Please try again.",
      );
    } finally {
      setNegotiationLoading(null);
    }
  };

  const runHandoverConfirm = async (type: HandoverType) => {
    if (!id) return;
    setActionError(null);
    setActionLoading("HANDOVER");
    try {
      await bookingsApi.confirmHandover(id, type);
      await fetchBooking();
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Could not confirm the handover. Please try again.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const imageUrl = booking
    ? (booking.listing.images.find((image) => image.isPrimary)?.url ??
      booking.listing.images[0]?.url ??
      null)
    : null;

  const isHost = !!booking && currentUserId === booking.hostId;
  const isGuest = !!booking && currentUserId === booking.guestId;
  const isParty = isHost || isGuest;

  const nextStep = booking
    ? progressionSteps[booking.listing.pillar][booking.status]
    : undefined;

  const negotiationOpen =
    !!booking && booking.isNegotiable && booking.status === "PENDING" && isParty;
  const myNegotiationTurn =
    !!booking && booking.lastActorId !== currentUserId;
  const myCounters = booking
    ? isHost
      ? booking.hostCounterCount
      : booking.guestCounterCount
    : 0;

  // Cancellation is penalty-free before ACTIVE per the platform terms; the
  // non-negotiable PENDING host already has the Decline action, so this block
  // covers everyone else the server permits.
  const canCancel =
    !!booking &&
    isParty &&
    (booking.status === "CONFIRMED" ||
      (booking.status === "PENDING" &&
        !(isHost && !booking.isNegotiable)));

  const canDispute =
    !!booking &&
    isParty &&
    disputableStatuses[booking.listing.pillar].includes(booking.status);

  const canReview =
    !!booking &&
    isParty &&
    reviewableStatuses[booking.listing.pillar].includes(booking.status);
  const otherPartyId = booking
    ? isGuest
      ? booking.hostId
      : booking.guestId
    : null;

  useEffect(() => {
    if (!canReview || !otherPartyId || !currentUserId) return;
    let cancelled = false;
    (async () => {
      try {
        // No "my review for this booking" endpoint exists; reviews about the
        // other party include reviewer + booking, which is enough to find ours.
        const res = await reviewsApi.getForUser(otherPartyId);
        if (cancelled) return;
        const mine = res.reviews.find(
          (review) =>
            review.booking.id === booking?.id &&
            review.reviewer.id === currentUserId,
        );
        if (mine) setMyReview(mine);
      } catch {
        // Detection is best-effort; a duplicate submit still fails cleanly
        // server-side with a clear message.
      } finally {
        if (!cancelled) setReviewChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canReview, otherPartyId, currentUserId, booking?.id]);

  const submitReview = async () => {
    if (!booking) return;
    setReviewError(null);

    const parsed = CreateReviewSchema.safeParse({
      bookingId: booking.id,
      rating: reviewRating,
      comment: reviewComment.trim() || undefined,
    });

    if (!parsed.success) {
      setReviewError(
        reviewRating === 0
          ? "Please select a star rating."
          : (parsed.error.issues[0]?.message ?? "Please check your review."),
      );
      return;
    }

    setReviewSubmitting(true);
    try {
      const res = await reviewsApi.create(parsed.data);
      setMyReview(res.review);
    } catch (err) {
      setReviewError(
        err instanceof ApiError
          ? err.message
          : "Could not submit your review. Please try again.",
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  const pendingHandoverType =
    booking && booking.listing.pillar === "RENTAL"
      ? handoverForStatus[booking.status]
      : undefined;
  const pendingHandover = pendingHandoverType
    ? booking?.handovers.find(
        (handover) => handover.type === pendingHandoverType,
      )
    : undefined;
  const myHandoverConfirmed = pendingHandover
    ? isGuest
      ? pendingHandover.guestConfirmed
      : pendingHandover.hostConfirmed
    : false;

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
        <ErrorState
          message={error ?? "Booking not found."}
          onRetry={fetchBooking}
        />
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
            {isParty && (
              <Pressable
                style={styles.chatButton}
                onPress={() =>
                  router.push({
                    pathname: "/chat/[bookingId]",
                    params: {
                      bookingId: booking.id,
                      title: isHost ? "Message guest" : "Message host",
                    },
                  })
                }
                hitSlop={6}
              >
                <MessageCircle
                  size={theme.typography.size.base}
                  color={theme.colors.gold}
                />
                <Text style={styles.chatButtonText}>
                  {isHost ? "Message guest" : "Message host"}
                </Text>
              </Pressable>
            )}
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Dates</Text>
              <Text style={styles.summaryValue}>
                {formatDateRange(booking.startDate, booking.endDate)}
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

          {booking.status === "PENDING" &&
            !booking.isNegotiable &&
            currentUserId === booking.hostId && (
              <View style={styles.actionsCard}>
                {declineMode ? (
                  <>
                    <Text style={styles.actionsLabel}>
                      Reason for declining
                    </Text>
                    <TextInput
                      value={declineReason}
                      onChangeText={setDeclineReason}
                      placeholder="Let the guest know why"
                      placeholderTextColor={theme.colors.mutedForeground}
                      multiline
                      numberOfLines={3}
                      style={styles.reasonInput}
                    />
                    <View style={styles.actionRow}>
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={() => {
                          setDeclineMode(false);
                          setDeclineReason("");
                          setActionError(null);
                        }}
                        disabled={actionLoading !== null}
                      >
                        <Text style={styles.secondaryButtonText}>Back</Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.declineButton,
                          (actionLoading !== null ||
                            declineReason.trim().length === 0) &&
                            styles.buttonDisabled,
                        ]}
                        onPress={() =>
                          runTransition(
                            "CANCELLED",
                            "DECLINE",
                            declineReason.trim(),
                          )
                        }
                        disabled={
                          actionLoading !== null ||
                          declineReason.trim().length === 0
                        }
                      >
                        {actionLoading === "DECLINE" ? (
                          <ActivityIndicator color={theme.colors.error} />
                        ) : (
                          <Text style={styles.declineButtonText}>
                            Confirm decline
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <View style={styles.actionRow}>
                    <Pressable
                      style={[
                        styles.declineButton,
                        actionLoading !== null && styles.buttonDisabled,
                      ]}
                      onPress={() => {
                        setDeclineMode(true);
                        setActionError(null);
                      }}
                      disabled={actionLoading !== null}
                    >
                      <Text style={styles.declineButtonText}>Decline</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.confirmButton,
                        actionLoading !== null && styles.buttonDisabled,
                      ]}
                      onPress={() => runTransition("CONFIRMED", "CONFIRM")}
                      disabled={actionLoading !== null}
                    >
                      {actionLoading === "CONFIRM" ? (
                        <ActivityIndicator
                          color={theme.colors.primaryForeground}
                        />
                      ) : (
                        <Text style={styles.confirmButtonText}>
                          Confirm booking
                        </Text>
                      )}
                    </Pressable>
                  </View>
                )}
                {actionError && (
                  <Text style={styles.actionErrorText}>{actionError}</Text>
                )}
              </View>
            )}

          {negotiationOpen && (
            <View style={styles.actionsCard}>
              <Text style={styles.actionsLabel}>Negotiation</Text>
              <View style={styles.offerRow}>
                <Text style={styles.offerLabel}>Current offer</Text>
                <Text style={styles.offerValue}>
                  {booking.currency}{" "}
                  {booking.currentOffer
                    ? Number(booking.currentOffer).toLocaleString()
                    : "--"}
                </Text>
              </View>
              {booking.budgetMin && (
                <Text style={styles.negotiationMeta}>
                  Guest budget: {booking.currency}{" "}
                  {Number(booking.budgetMin).toLocaleString()} -{" "}
                  {Number(booking.budgetMax ?? 0).toLocaleString()}
                </Text>
              )}
              <Text style={styles.negotiationMeta}>
                Counters used: you {myCounters}/2, other party{" "}
                {isHost
                  ? booking.guestCounterCount
                  : booking.hostCounterCount}
                /2
              </Text>
              {booking.negotiationExpiresAt && (
                <Text style={styles.negotiationMeta}>
                  Respond by {formatDate(booking.negotiationExpiresAt)}
                </Text>
              )}

              {myNegotiationTurn ? (
                <>
                  <Pressable
                    style={[
                      styles.progressButton,
                      negotiationLoading !== null && styles.buttonDisabled,
                    ]}
                    onPress={runAcceptOffer}
                    disabled={negotiationLoading !== null}
                  >
                    {negotiationLoading === "ACCEPT" ? (
                      <ActivityIndicator
                        color={theme.colors.primaryForeground}
                      />
                    ) : (
                      <Text style={styles.confirmButtonText}>
                        Accept offer
                      </Text>
                    )}
                  </Pressable>

                  {myCounters < 2 ? (
                    <View style={styles.counterRow}>
                      <TextInput
                        value={counterAmount}
                        onChangeText={setCounterAmount}
                        placeholder="Counter amount"
                        placeholderTextColor={theme.colors.mutedForeground}
                        keyboardType="numeric"
                        style={styles.counterInput}
                      />
                      <Pressable
                        style={[
                          styles.counterButton,
                          negotiationLoading !== null && styles.buttonDisabled,
                        ]}
                        onPress={runCounter}
                        disabled={negotiationLoading !== null}
                      >
                        {negotiationLoading === "COUNTER" ? (
                          <ActivityIndicator color={theme.colors.gold} />
                        ) : (
                          <Text style={styles.counterButtonText}>Counter</Text>
                        )}
                      </Pressable>
                    </View>
                  ) : (
                    <Text style={styles.negotiationMeta}>
                      You have used all your counters - accept the offer or
                      let the negotiation expire.
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.negotiationMeta}>
                  Waiting for the other party to accept or counter your
                  offer.
                </Text>
              )}
              {negotiationError && (
                <Text style={styles.actionErrorText}>{negotiationError}</Text>
              )}
            </View>
          )}

          {isParty && nextStep && (
            <View style={styles.actionsCard}>
              <Text style={styles.actionsLabel}>Next step</Text>
              <Pressable
                style={[
                  styles.progressButton,
                  actionLoading !== null && styles.buttonDisabled,
                ]}
                onPress={() => runTransition(nextStep.to, "PROGRESS")}
                disabled={actionLoading !== null}
              >
                {actionLoading === "PROGRESS" ? (
                  <ActivityIndicator color={theme.colors.primaryForeground} />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {nextStep.label}
                  </Text>
                )}
              </Pressable>
              {actionError && (
                <Text style={styles.actionErrorText}>{actionError}</Text>
              )}
            </View>
          )}

          {isParty && pendingHandover && (
            <View style={styles.actionsCard}>
              <Text style={styles.actionsLabel}>
                {pendingHandover.type === "PICKUP"
                  ? "Pickup handover"
                  : "Return handover"}
              </Text>
              <Text style={styles.handoverHint}>
                Both of you must confirm before the booking{" "}
                {pendingHandover.type === "PICKUP"
                  ? "becomes active."
                  : "is completed."}
              </Text>

              {(
                [
                  ["Guest", pendingHandover.guestConfirmed],
                  ["Host", pendingHandover.hostConfirmed],
                ] as const
              ).map(([label, confirmed]) => (
                <View key={label} style={styles.handoverRow}>
                  {confirmed ? (
                    <CircleCheck
                      size={theme.typography.size.base}
                      color={theme.colors.success}
                    />
                  ) : (
                    <Circle
                      size={theme.typography.size.base}
                      color={theme.colors.mutedForeground}
                    />
                  )}
                  <Text style={styles.handoverPartyText}>{label}</Text>
                  <Text
                    style={[
                      styles.handoverStateText,
                      confirmed && styles.handoverStateConfirmed,
                    ]}
                  >
                    {confirmed ? "Confirmed" : "Waiting"}
                  </Text>
                </View>
              ))}

              {myHandoverConfirmed ? (
                <Text style={styles.handoverHint}>
                  You have confirmed. Waiting for the other party.
                </Text>
              ) : (
                <Pressable
                  style={[
                    styles.progressButton,
                    actionLoading !== null && styles.buttonDisabled,
                  ]}
                  onPress={() => runHandoverConfirm(pendingHandover.type)}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === "HANDOVER" ? (
                    <ActivityIndicator
                      color={theme.colors.primaryForeground}
                    />
                  ) : (
                    <Text style={styles.confirmButtonText}>
                      {pendingHandover.type === "PICKUP"
                        ? "Confirm pickup"
                        : "Confirm return"}
                    </Text>
                  )}
                </Pressable>
              )}
              {actionError && (
                <Text style={styles.actionErrorText}>{actionError}</Text>
              )}
            </View>
          )}

          {canCancel && (
            <View style={styles.actionsCard}>
              {cancelMode ? (
                <>
                  <Text style={styles.actionsLabel}>
                    Reason for cancelling
                  </Text>
                  <TextInput
                    value={cancelReason}
                    onChangeText={setCancelReason}
                    placeholder="Let the other party know why"
                    placeholderTextColor={theme.colors.mutedForeground}
                    multiline
                    numberOfLines={3}
                    style={styles.reasonInput}
                  />
                  <View style={styles.actionRow}>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => {
                        setCancelMode(false);
                        setCancelReason("");
                        setActionError(null);
                      }}
                      disabled={actionLoading !== null}
                    >
                      <Text style={styles.secondaryButtonText}>Back</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.declineButton,
                        (actionLoading !== null ||
                          cancelReason.trim().length === 0) &&
                          styles.buttonDisabled,
                      ]}
                      onPress={() =>
                        runTransition(
                          "CANCELLED",
                          "CANCEL",
                          cancelReason.trim(),
                        )
                      }
                      disabled={
                        actionLoading !== null ||
                        cancelReason.trim().length === 0
                      }
                    >
                      {actionLoading === "CANCEL" ? (
                        <ActivityIndicator color={theme.colors.error} />
                      ) : (
                        <Text style={styles.declineButtonText}>
                          Confirm cancellation
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </>
              ) : (
                <Pressable
                  style={[
                    styles.declineButton,
                    actionLoading !== null && styles.buttonDisabled,
                  ]}
                  onPress={() => {
                    setCancelMode(true);
                    setActionError(null);
                  }}
                  disabled={actionLoading !== null}
                >
                  <Text style={styles.declineButtonText}>Cancel booking</Text>
                </Pressable>
              )}
              {actionError && (
                <Text style={styles.actionErrorText}>{actionError}</Text>
              )}
            </View>
          )}

          {canDispute && (
            <View style={styles.actionsCard}>
              {disputeMode ? (
                <>
                  <Text style={styles.actionsLabel}>
                    What went wrong?
                  </Text>
                  <TextInput
                    value={disputeReason}
                    onChangeText={setDisputeReason}
                    placeholder="Describe the problem - photos and messages can be provided to support later"
                    placeholderTextColor={theme.colors.mutedForeground}
                    multiline
                    numberOfLines={3}
                    style={styles.reasonInput}
                  />
                  <Text style={styles.disputeHint}>
                    Raising a dispute freezes this booking for review by the
                    Lenda team.
                  </Text>
                  <View style={styles.actionRow}>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => {
                        setDisputeMode(false);
                        setDisputeReason("");
                        setActionError(null);
                      }}
                      disabled={actionLoading !== null}
                    >
                      <Text style={styles.secondaryButtonText}>Back</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.declineButton,
                        (actionLoading !== null ||
                          disputeReason.trim().length === 0) &&
                          styles.buttonDisabled,
                      ]}
                      onPress={() =>
                        runTransition(
                          "DISPUTED",
                          "DISPUTE",
                          disputeReason.trim(),
                        )
                      }
                      disabled={
                        actionLoading !== null ||
                        disputeReason.trim().length === 0
                      }
                    >
                      {actionLoading === "DISPUTE" ? (
                        <ActivityIndicator color={theme.colors.error} />
                      ) : (
                        <Text style={styles.declineButtonText}>
                          Raise dispute
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </>
              ) : (
                <Pressable
                  style={styles.disputeLink}
                  onPress={() => {
                    setDisputeMode(true);
                    setActionError(null);
                  }}
                  hitSlop={6}
                >
                  <Text style={styles.disputeLinkText}>Report a problem</Text>
                </Pressable>
              )}
              {actionError && (
                <Text style={styles.actionErrorText}>{actionError}</Text>
              )}
            </View>
          )}

          {canReview && reviewChecked && (
            <View style={styles.actionsCard}>
              <Text style={styles.actionsLabel}>
                {myReview
                  ? "Your review"
                  : isGuest
                    ? "Rate your host"
                    : "Rate your guest"}
              </Text>
              {myReview ? (
                <>
                  <StarRating
                    rating={myReview.rating}
                    size={theme.typography.size.xl}
                  />
                  {myReview.comment && (
                    <Text style={styles.reviewCommentText}>
                      {myReview.comment}
                    </Text>
                  )}
                </>
              ) : (
                <>
                  <StarRating
                    rating={reviewRating}
                    size={theme.typography.size.xxl}
                    onSelect={setReviewRating}
                  />
                  <TextInput
                    value={reviewComment}
                    onChangeText={setReviewComment}
                    placeholder="Share a few words (optional)"
                    placeholderTextColor={theme.colors.mutedForeground}
                    multiline
                    numberOfLines={3}
                    style={styles.reasonInput}
                  />
                  {reviewError && (
                    <Text style={styles.actionErrorText}>{reviewError}</Text>
                  )}
                  <Pressable
                    style={[
                      styles.progressButton,
                      reviewSubmitting && styles.buttonDisabled,
                    ]}
                    onPress={submitReview}
                    disabled={reviewSubmitting}
                  >
                    {reviewSubmitting ? (
                      <ActivityIndicator
                        color={theme.colors.primaryForeground}
                      />
                    ) : (
                      <Text style={styles.confirmButtonText}>
                        Submit review
                      </Text>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          )}

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
    alignItems: "center",
    justifyContent: "space-between",
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    borderColor: theme.colors.gold,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  chatButtonText: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodySemibold,
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
  actionsCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  actionsLabel: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyMedium,
    textTransform: "uppercase",
  },
  reasonInput: {
    minHeight: theme.spacing.xxl + theme.spacing.md,
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
  actionRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  confirmButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: theme.spacing.xxl,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  progressButton: {
    alignItems: "center",
    justifyContent: "center",
    height: theme.spacing.xxl,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  handoverHint: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  handoverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  handoverPartyText: {
    flex: 1,
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyMedium,
  },
  handoverStateText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodySemibold,
    textTransform: "uppercase",
  },
  handoverStateConfirmed: {
    color: theme.colors.success,
  },
  offerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  offerLabel: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
  offerValue: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.font.displayBold,
  },
  negotiationMeta: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  counterRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  counterInput: {
    flex: 1,
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
  counterButton: {
    alignItems: "center",
    justifyContent: "center",
    height: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.gold,
  },
  counterButtonText: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  disputeHint: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  disputeLink: {
    alignItems: "center",
  },
  disputeLinkText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
    textDecorationLine: "underline",
  },
  reviewCommentText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
  confirmButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  declineButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: theme.spacing.xxl,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  declineButtonText: {
    color: theme.colors.error,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  secondaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: theme.spacing.xxl,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  actionErrorText: {
    color: theme.colors.error,
    fontSize: theme.typography.size.xs,
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
