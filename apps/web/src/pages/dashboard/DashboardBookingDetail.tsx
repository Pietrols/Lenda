import { useParams, Link } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { api, BOOKING_URL } from "@/api/client";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  MapPin,
  Calendar,
  Star,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  User,
  ArrowRight,
  Send,
  Package,
  RotateCcw,
  Trophy,
  MessageCircle,
  MessageSquare,
  TrendingUp,
} from "lucide-react";

type BookingHistory = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedById: string;
  reason: string | null;
  createdAt: string;
};

type Handover = {
  id: string;
  type: string;
  guestConfirmed: boolean;
  hostConfirmed: boolean;
  guestConfirmedAt: string | null;
  hostConfirmedAt: string | null;
  createdAt: string;
};

type Booking = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalAmount: string;
  currency: string;
  pickupType: string;
  notes: string | null;
  guestId: string;
  hostId: string;
  isNegotiable: boolean;
  budgetMin: string | null;
  budgetMax: string | null;
  currentOffer: string | null;
  hostCounterCount: number;
  guestCounterCount: number;
  negotiationExpiresAt: string | null;
  lastActorId: string | null;
  listing: {
    id: string;
    title: string;
    category: string;
    pillar: string;
    location: string;
    pricePerDay: string;
    images: { url: string; isPrimary: boolean; order: number }[];
  };
  history: BookingHistory[];
  handovers: Handover[];
};

type Review = {
  id: string;
  type: string;
  rating: number;
  comment: string | null;
  reviewerId: string;
};

type BookingMessage = {
  id: string;
  bookingId: string;
  senderId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    fullName: string | null;
    photoUrl: string | null;
  };
};

type StatusConfig = {
  label: string;
  color: string;
  icon: React.ReactNode;
};

const statusConfig: Record<string, StatusConfig> = {
  PENDING: {
    label: "Pending",
    color: "text-yellow-500",
    icon: <Clock size={14} />,
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "text-blue-400",
    icon: <CheckCircle size={14} />,
  },
  EN_ROUTE: {
    label: "En Route",
    color: "text-blue-400",
    icon: <Clock size={14} />,
  },
  HANDED_OVER: {
    label: "Handed Over",
    color: "text-gold",
    icon: <CheckCircle size={14} />,
  },
  ACTIVE: {
    label: "Active",
    color: "text-green-400",
    icon: <CheckCircle size={14} />,
  },
  RETURN_PENDING: {
    label: "Return Pending",
    color: "text-yellow-500",
    icon: <Clock size={14} />,
  },
  RETURNED: {
    label: "Returned",
    color: "text-foreground/60",
    icon: <CheckCircle size={14} />,
  },
  COMPLETED: {
    label: "Completed",
    color: "text-foreground/40",
    icon: <CheckCircle size={14} />,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "text-destructive",
    icon: <XCircle size={14} />,
  },
  DISPUTED: {
    label: "Disputed",
    color: "text-orange-400",
    icon: <AlertCircle size={14} />,
  },
  NEGOTIATION_FAILED: {
    label: "Negotiation Failed",
    color: "text-destructive",
    icon: <XCircle size={14} />,
  },
};

const reviewSchema = z.object({
  rating: z.coerce.number().min(1).max(5),
  comment: z.string().optional(),
});

type ReviewForm = z.infer<typeof reviewSchema>;

function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setRemaining(Math.max(0, diff));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const expired = remaining === 0 && !!expiresAt;

  return { hours, minutes, seconds, expired };
}

function NegotiationCard({
  booking,
  isGuest,
  isHost,
  isMyTurn,
  onCounter,
  onAccept,
  onCancel,
  isCountering,
  isAccepting,
  isCancelling,
}: {
  booking: Booking;
  isGuest: boolean;
  isHost: boolean;
  isMyTurn: boolean;
  onCounter: (amount: number) => void;
  onAccept: () => void;
  onCancel: () => void;
  isCountering: boolean;
  isAccepting: boolean;
  isCancelling: boolean;
}) {
  const [counterInput, setCounterInput] = useState("");
  const { hours, minutes, seconds, expired } = useCountdown(
    booking.negotiationExpiresAt,
  );

  const MAX_COUNTERS = 2;
  const myCounterCount = isHost
    ? booking.hostCounterCount
    : booking.guestCounterCount;
  const otherCounterCount = isHost
    ? booking.guestCounterCount
    : booking.hostCounterCount;
  const canCounter = myCounterCount < MAX_COUNTERS && !expired;
  const countersLeft = MAX_COUNTERS - myCounterCount;

  const currentOffer = booking.currentOffer
    ? parseFloat(booking.currentOffer)
    : booking.budgetMax
      ? parseFloat(booking.budgetMax)
      : null;

  const budgetMin = booking.budgetMin ? parseFloat(booking.budgetMin) : null;
  const budgetMax = booking.budgetMax ? parseFloat(booking.budgetMax) : null;

  return (
    <div className="glass-card p-5 border border-gold/30 bg-gold/[0.02] flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <MessageSquare size={16} className="text-gold" />
        <h3 className="font-display font-bold text-sm text-foreground uppercase tracking-tight">
          Negotiation in Progress
        </h3>
      </div>
      <GoldLine className="w-8" />

      <div className="flex flex-col gap-2">
        {budgetMax !== null && (
          <div className="flex justify-between text-sm">
            <span className="text-foreground/50">Opening offer</span>
            <span className="text-foreground font-medium">
              {booking.currency} {budgetMax.toFixed(2)}
            </span>
          </div>
        )}
        {budgetMin !== null && (
          <div className="flex justify-between text-sm">
            <span className="text-foreground/50">Guest minimum</span>
            <span className="text-foreground/60">
              {booking.currency} {budgetMin.toFixed(2)}
            </span>
          </div>
        )}
        {currentOffer !== null && booking.currentOffer && (
          <div className="flex justify-between text-sm border-t border-border pt-2 mt-1">
            <span className="text-foreground/50">Current offer</span>
            <span className="font-display font-bold text-gold">
              {booking.currency} {currentOffer.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-6">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-foreground/40">Your counters left</p>
          <p
            className={cn(
              "text-sm font-bold",
              countersLeft === 0 ? "text-destructive" : "text-foreground",
            )}
          >
            {countersLeft} / {MAX_COUNTERS}
          </p>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-foreground/40">Their counters left</p>
          <p className="text-sm font-bold text-foreground">
            {MAX_COUNTERS - otherCounterCount} / {MAX_COUNTERS}
          </p>
        </div>
      </div>

      {booking.negotiationExpiresAt && (
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-sm",
            expired
              ? "bg-destructive/10 text-destructive"
              : "bg-foreground/5 text-foreground/60",
          )}
        >
          <Clock size={13} className="shrink-0" />
          {expired ? (
            <span>Negotiation window has expired.</span>
          ) : (
            <span>
              Time remaining:{" "}
              <span className="font-mono font-bold text-foreground">
                {String(hours).padStart(2, "0")}:
                {String(minutes).padStart(2, "0")}:
                {String(seconds).padStart(2, "0")}
              </span>
            </span>
          )}
        </div>
      )}

      {!expired && (isGuest || isHost) && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Accept{" "}
                {currentOffer !== null
                  ? `${booking.currency} ${currentOffer.toFixed(2)}`
                  : "offer"}
              </p>
              <p className="text-xs text-foreground/40">
                Lock in this amount and confirm the booking.
              </p>
            </div>
            <Button
              variant="gold"
              size="sm"
              disabled={isAccepting || isCountering}
              onClick={onAccept}
              className="shrink-0"
            >
              {isAccepting ? "Accepting..." : "Accept"}
            </Button>
          </div>

          {isMyTurn && canCounter && (
            <div className="border-t border-border pt-3 flex flex-col gap-2">
              <p className="text-xs text-foreground/50">
                Counter with a different amount ({countersLeft} counter
                {countersLeft !== 1 ? "s" : ""} left)
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30 text-xs">
                    {booking.currency}
                  </span>
                  <input
                    type="number"
                    min={1}
                    step="0.01"
                    value={counterInput}
                    onChange={(e) => setCounterInput(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full h-10 pl-12 pr-3 rounded-xl bg-background border border-border text-foreground text-sm outline-none transition-colors focus:border-gold/60"
                  />
                </div>
                <Button
                  variant="outlineGold"
                  size="sm"
                  disabled={
                    isCountering ||
                    isAccepting ||
                    !counterInput ||
                    Number(counterInput) <= 0
                  }
                  onClick={() => {
                    const amount = Number(counterInput);
                    if (amount > 0) {
                      onCounter(amount);
                      setCounterInput("");
                    }
                  }}
                  className="shrink-0 gap-1.5"
                >
                  <TrendingUp size={13} />
                  {isCountering ? "Sending..." : "Counter"}
                </Button>
              </div>
            </div>
          )}

          {!isMyTurn && (
            <p className="text-xs text-foreground/40 border-t border-border pt-3">
              Waiting for the other party to respond to your offer of{" "}
              {currentOffer !== null
                ? `${booking.currency} ${currentOffer.toFixed(2)}`
                : "your offer"}
              .
            </p>
          )}

          {isMyTurn && !canCounter && (
            <p className="text-xs text-foreground/40 border-t border-border pt-3">
              You have used all your counters. You can only accept or wait for
              the other party.
            </p>
          )}

          <Button
            variant="ghost"
            size="sm"
            disabled={isCancelling || isCountering || isAccepting}
            onClick={onCancel}
            className="text-destructive hover:text-destructive self-start"
          >
            {isCancelling ? "Cancelling..." : "Cancel Negotiation"}
          </Button>
        </div>
      )}
    </div>
  );
}

function HandoverCard({
  handover,
  isGuest,
  isHost,
  onConfirm,
  isConfirming,
}: {
  handover: Handover;
  isGuest: boolean;
  isHost: boolean;
  onConfirm: () => void;
  isConfirming: boolean;
}) {
  const isPickup = handover.type === "PICKUP";
  const myConfirmed = isGuest
    ? handover.guestConfirmed
    : handover.hostConfirmed;
  const bothConfirmed = handover.guestConfirmed && handover.hostConfirmed;

  return (
    <div className="glass-card p-5 border border-gold/20 bg-gold/[0.02]">
      <div className="flex items-center gap-2 mb-3">
        {isPickup ? (
          <Package size={16} className="text-gold" />
        ) : (
          <RotateCcw size={16} className="text-gold" />
        )}
        <h3 className="font-display font-bold text-sm text-foreground uppercase tracking-tight">
          {isPickup ? "Pickup Confirmation" : "Return Confirmation"}
        </h3>
      </div>
      <GoldLine className="w-8 mb-4" />
      <p className="text-foreground/50 text-xs mb-4">
        {isPickup
          ? "Both parties must confirm the item has been handed over."
          : "Both parties must confirm the item has been returned."}
      </p>
      <div className="flex flex-col gap-2 mb-4">
        {[
          {
            label: "Guest",
            confirmed: handover.guestConfirmed,
            confirmedAt: handover.guestConfirmedAt,
          },
          {
            label: "Host",
            confirmed: handover.hostConfirmed,
            confirmedAt: handover.hostConfirmedAt,
          },
        ].map((party) => (
          <div key={party.label} className="flex items-center gap-3">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center",
                party.confirmed ? "bg-green-400/20" : "bg-foreground/5",
              )}
            >
              {party.confirmed ? (
                <CheckCircle size={13} className="text-green-400" />
              ) : (
                <Clock size={13} className="text-foreground/30" />
              )}
            </div>
            <span className="text-sm text-foreground">{party.label}</span>
            <span
              className={cn(
                "text-xs ml-auto",
                party.confirmed ? "text-green-400" : "text-foreground/30",
              )}
            >
              {party.confirmed
                ? `Confirmed ${new Date(party.confirmedAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Pending"}
            </span>
          </div>
        ))}
      </div>
      {!bothConfirmed && !myConfirmed && (isGuest || isHost) && (
        <Button
          variant="gold"
          size="sm"
          className="gap-2"
          disabled={isConfirming}
          onClick={onConfirm}
        >
          <CheckCircle size={14} />
          {isConfirming
            ? "Confirming..."
            : `Confirm ${isPickup ? "Pickup" : "Return"}`}
        </Button>
      )}
      {!bothConfirmed && myConfirmed && (
        <p className="text-foreground/40 text-xs">
          Waiting for the other party to confirm.
        </p>
      )}
      {bothConfirmed && (
        <p className="text-green-400 text-xs font-medium">
          {isPickup ? "Pickup" : "Return"} confirmed by both parties.
        </p>
      )}
    </div>
  );
}

function ReviewModal({
  isGuest,
  onSubmit,
  onSkip,
  isSubmitting,
}: {
  isGuest: boolean;
  onSubmit: (data: ReviewForm) => void;
  onSkip: () => void;
  isSubmitting: boolean;
}) {
  const { register, handleSubmit, control } = useForm<ReviewForm>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 5 },
  });
  const rating = useWatch({ control, name: "rating" });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="glass-card border border-gold/30 w-full max-w-md">
        <div className="p-6 flex flex-col items-center text-center border-b border-border">
          <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center mb-3">
            <Trophy size={28} className="text-gold" />
          </div>
          <h3 className="font-display font-bold text-xl text-foreground uppercase tracking-tight mb-1">
            Booking Complete!
          </h3>
          <GoldLine className="w-10 mb-2" />
          <p className="text-foreground/50 text-sm">
            {isGuest
              ? "How was your experience with this host?"
              : "How was this guest to work with?"}
          </p>
        </div>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="p-6 flex flex-col gap-5"
        >
          <div className="flex flex-col gap-2 items-center">
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <label key={star} className="cursor-pointer">
                  <input
                    type="radio"
                    value={star}
                    {...register("rating")}
                    className="sr-only"
                  />
                  <Star
                    size={32}
                    className={cn(
                      "transition-all",
                      star <= Number(rating)
                        ? "text-gold fill-gold scale-110"
                        : "text-foreground/20",
                    )}
                  />
                </label>
              ))}
            </div>
            <p className="text-foreground/40 text-sm">{Number(rating)} / 5</p>
          </div>
          <textarea
            {...register("comment")}
            rows={3}
            placeholder={
              isGuest
                ? "Share what made this experience great (or not)..."
                : "How was this guest to work with?"
            }
            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/30 text-sm outline-none focus:border-gold/60 resize-none"
          />
          <div className="flex gap-3">
            <Button
              type="submit"
              variant="gold"
              size="md"
              className="flex-1 gap-2"
              disabled={isSubmitting}
            >
              <Star size={15} />
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onSkip}
              className="shrink-0"
            >
              Skip
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DashboardBookingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [messageInput, setMessageInput] = useState("");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [hasPromptedReview, setHasPromptedReview] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: () =>
      api.get<{ booking: Booking }>(
        `/bookings/${id}`,
        accessToken,
        BOOKING_URL,
      ),
    enabled: !!id && !!accessToken,
    refetchInterval: 10000,
  });

  const { data: messagesData, refetch: refetchMessages } = useQuery({
    queryKey: ["messages", id],
    queryFn: () =>
      api.get<{ messages: BookingMessage[] }>(
        `/bookings/${id}/messages`,
        accessToken,
        BOOKING_URL,
      ),
    enabled: !!id && !!accessToken,
    refetchInterval: 10000,
  });

  const { data: reviewsData, refetch: refetchReviews } = useQuery({
    queryKey: ["booking-reviews", id],
    queryFn: async () => {
      const booking = data?.booking;
      if (!booking) return { reviews: [] };
      return api.get<{ reviews: Review[] }>(
        `/reviews/user/${booking.hostId}`,
        undefined,
        BOOKING_URL,
      );
    },
    enabled: !!data?.booking,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesData]);

  const booking = data?.booking;
  const reviews = reviewsData?.reviews ?? [];
  const isGuest = user?.id === booking?.guestId;
  const isHost = user?.id === booking?.hostId;
  const isRental = booking?.listing.pillar === "RENTAL";
  const myReviewType = isGuest ? "GUEST_TO_HOST" : "HOST_TO_GUEST";
  const hasReviewed = reviews.some(
    (r) => r.reviewerId === user?.id && r.type === myReviewType,
  );
  const canReview =
    booking?.status === "COMPLETED" && (isGuest || isHost) && !hasReviewed;

  useEffect(() => {
    if (canReview && !hasPromptedReview) {
      const timer = setTimeout(() => {
        setShowReviewModal(true);
        setHasPromptedReview(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [canReview, hasPromptedReview]);

  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: (message: string) =>
      api.post<{ message: BookingMessage }>(
        `/bookings/${id}/messages`,
        { message },
        accessToken,
        BOOKING_URL,
      ),
    onSuccess: () => {
      setMessageInput("");
      refetchMessages();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { mutate: transitionStatus, isPending: isTransitioning } = useMutation({
    mutationFn: (toStatus: string) =>
      api.patch<{ booking: Booking }>(
        `/bookings/${id}/status`,
        { status: toStatus },
        accessToken,
        BOOKING_URL,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking updated.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { mutate: confirmHandover, isPending: isConfirming } = useMutation({
    mutationFn: (type: "PICKUP" | "RETURN") =>
      api.post(
        `/bookings/${id}/handover/confirm`,
        { type },
        accessToken,
        BOOKING_URL,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
      toast.success("Handover confirmation recorded.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { mutate: submitCounter, isPending: isCountering } = useMutation({
    mutationFn: (amount: number) =>
      api.post<{ booking: Booking }>(
        `/bookings/${id}/counter`,
        { amount },
        accessToken,
        BOOKING_URL,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
      toast.success("Counter sent.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { mutate: acceptOffer, isPending: isAccepting } = useMutation({
    mutationFn: () =>
      api.post<{ booking: Booking }>(
        `/bookings/${id}/accept-offer`,
        {},
        accessToken,
        BOOKING_URL,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Offer accepted! Booking confirmed.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { mutate: submitReview, isPending: isReviewing } = useMutation({
    mutationFn: (formData: ReviewForm) =>
      api.post<{ review: Review }>(
        "/reviews",
        { bookingId: id, ...formData },
        accessToken,
        BOOKING_URL,
      ),
    onSuccess: () => {
      refetchReviews();
      setShowReviewModal(false);
      toast.success("Review submitted. Thank you!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const primaryImage =
    booking?.listing.images?.find((i) => i.isPrimary)?.url ??
    booking?.listing.images?.[0]?.url;
  const status = booking ? statusConfig[booking.status] : null;
  const pickupHandover = booking?.handovers.find((h) => h.type === "PICKUP");
  const returnHandover = booking?.handovers.find((h) => h.type === "RETURN");
  const activeHandover =
    booking?.status === "HANDED_OVER"
      ? pickupHandover
      : booking?.status === "RETURN_PENDING"
        ? returnHandover
        : null;
  const isActiveBooking =
    booking &&
    !["COMPLETED", "CANCELLED", "NEGOTIATION_FAILED"].includes(booking.status);
  const isNegotiablePending =
    booking?.status === "PENDING" && booking?.isNegotiable;

  if (isLoading || !booking) {
    return (
      <div className="flex flex-col gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="glass-card p-6 border border-border h-28 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {showReviewModal && (
        <ReviewModal
          isGuest={isGuest}
          onSubmit={(d) => submitReview(d)}
          onSkip={() => setShowReviewModal(false)}
          isSubmitting={isReviewing}
        />
      )}

      <Link
        to="/dashboard/bookings"
        className="inline-flex items-center gap-2 text-sm text-foreground/40 hover:text-foreground transition-colors"
      >
        <ChevronLeft size={16} /> Back to bookings
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-label">Booking</p>
          <GoldLine className="w-10 mb-3" />
          <h2 className="font-display font-bold text-2xl text-foreground uppercase tracking-tight">
            {booking.listing.title}
          </h2>
        </div>
        {status && (
          <span
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-current/20 bg-current/5 shrink-0",
              status.color,
            )}
          >
            {status.icon}
            {status.label}
          </span>
        )}
      </div>

      {/* Listing card */}
      <div className="glass-card border border-border overflow-hidden">
        <div className="flex gap-4 p-4">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-foreground/5 shrink-0">
            {primaryImage ? (
              <img
                src={primaryImage}
                alt={booking.listing.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MapPin size={20} className="text-foreground/20" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">
              {booking.listing.title}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <MapPin size={11} className="text-foreground/30" />
              <p className="text-foreground/40 text-xs">
                {booking.listing.location}
              </p>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Calendar size={11} className="text-foreground/30" />
              <p className="text-foreground/40 text-xs">
                {new Date(booking.startDate).toLocaleDateString()} {"->"}{" "}
                {new Date(booking.endDate).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Link
            to={`/listings/${booking.listing.id}`}
            className="text-gold/60 hover:text-gold transition-colors shrink-0"
          >
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="border-t border-border p-4 flex items-center justify-between">
          {booking.isNegotiable ? (
            <p className="text-foreground/50 text-sm">Negotiable pricing</p>
          ) : (
            <p className="text-foreground/50 text-sm">
              {booking.currency} {booking.listing.pricePerDay} x{" "}
              {booking.totalDays} day{booking.totalDays !== 1 ? "s" : ""}
            </p>
          )}
          <p className="font-display font-bold text-foreground">
            {booking.currency} {parseFloat(booking.totalAmount).toFixed(2)}
          </p>
        </div>
        {booking.notes && (
          <div className="border-t border-border p-4">
            <p className="text-micro text-foreground/50 mb-1">Notes</p>
            <p className="text-sm text-foreground/60">{booking.notes}</p>
          </div>
        )}
      </div>

      {/* NEGOTIATION_FAILED */}
      {booking.status === "NEGOTIATION_FAILED" && (
        <div className="glass-card p-5 border border-destructive/20 bg-destructive/5">
          <div className="flex items-center gap-3">
            <XCircle size={16} className="text-destructive shrink-0" />
            <div>
              <p className="font-semibold text-sm text-foreground">
                Negotiation Ended
              </p>
              <p className="text-foreground/40 text-xs">
                No agreement was reached. This booking has been cancelled. You
                are welcome to start a new request.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PENDING — Negotiable */}
      {isNegotiablePending && (
        <NegotiationCard
          booking={booking}
          isGuest={isGuest}
          isHost={isHost}
          isMyTurn={booking.lastActorId !== user?.id}
          onCounter={(amount) => submitCounter(amount)}
          onAccept={() => acceptOffer()}
          onCancel={() => transitionStatus("CANCELLED")}
          isCountering={isCountering}
          isAccepting={isAccepting}
          isCancelling={isTransitioning}
        />
      )}

      {/* PENDING — Standard host */}
      {booking.status === "PENDING" && !booking.isNegotiable && isHost && (
        <div className="glass-card p-5 border border-gold/20 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm text-foreground mb-0.5">
              Booking Request
            </p>
            <p className="text-foreground/40 text-xs">
              Confirm or decline this booking request.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="gold"
              size="sm"
              disabled={isTransitioning}
              onClick={() => transitionStatus("CONFIRMED")}
            >
              Confirm
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={isTransitioning}
              onClick={() => transitionStatus("CANCELLED")}
              className="text-destructive hover:text-destructive"
            >
              Decline
            </Button>
          </div>
        </div>
      )}

      {/* PENDING — Standard guest */}
      {booking.status === "PENDING" && !booking.isNegotiable && isGuest && (
        <div className="glass-card p-5 border border-border flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm text-foreground mb-0.5">
              Awaiting confirmation
            </p>
            <p className="text-foreground/40 text-xs">
              The host will confirm or decline your request.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={isTransitioning}
            onClick={() => transitionStatus("CANCELLED")}
            className="text-destructive hover:text-destructive shrink-0"
          >
            Cancel Request
          </Button>
        </div>
      )}

      {/* CONFIRMED */}
      {booking.status === "CONFIRMED" && (isGuest || isHost) && (
        <div className="glass-card p-5 border border-border flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm text-foreground mb-0.5">
              {isRental ? "Ready to head over?" : "Ready to start?"}
            </p>
            <p className="text-foreground/40 text-xs">
              {isRental
                ? "Mark as en route when heading to meet the other party."
                : "Mark as active when the service begins."}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outlineGold"
              size="sm"
              disabled={isTransitioning}
              onClick={() => transitionStatus(isRental ? "EN_ROUTE" : "ACTIVE")}
            >
              {isRental ? "Mark En Route" : "Start Service"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={isTransitioning}
              onClick={() => transitionStatus("CANCELLED")}
              className="text-destructive hover:text-destructive"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* EN_ROUTE */}
      {booking.status === "EN_ROUTE" && (isGuest || isHost) && (
        <div className="glass-card p-5 border border-border flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm text-foreground mb-0.5">
              At the handover point?
            </p>
            <p className="text-foreground/40 text-xs">
              Mark as handed over once the item is with the guest.
            </p>
          </div>
          <Button
            variant="outlineGold"
            size="sm"
            disabled={isTransitioning}
            onClick={() => transitionStatus("HANDED_OVER")}
          >
            Mark Handed Over
          </Button>
        </div>
      )}

      {/* HANDED_OVER */}
      {booking.status === "HANDED_OVER" && activeHandover && (
        <HandoverCard
          handover={activeHandover}
          isGuest={isGuest}
          isHost={isHost}
          onConfirm={() => confirmHandover("PICKUP")}
          isConfirming={isConfirming}
        />
      )}

      {/* ACTIVE rental */}
      {booking.status === "ACTIVE" && isRental && (isGuest || isHost) && (
        <div className="glass-card p-5 border border-border flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm text-foreground mb-0.5">
              Ready to return?
            </p>
            <p className="text-foreground/40 text-xs">
              Initiate the return process when the rental period is ending.
            </p>
          </div>
          <Button
            variant="outlineGold"
            size="sm"
            disabled={isTransitioning}
            onClick={() => transitionStatus("RETURN_PENDING")}
          >
            Request Return
          </Button>
        </div>
      )}

      {/* ACTIVE service */}
      {booking.status === "ACTIVE" && !isRental && (isGuest || isHost) && (
        <div className="glass-card p-5 border border-border flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm text-foreground mb-0.5">
              Service complete?
            </p>
            <p className="text-foreground/40 text-xs">
              Mark as completed once the service has been delivered.
            </p>
          </div>
          <Button
            variant="outlineGold"
            size="sm"
            disabled={isTransitioning}
            onClick={() => transitionStatus("COMPLETED")}
          >
            Mark Complete
          </Button>
        </div>
      )}

      {/* RETURN_PENDING */}
      {booking.status === "RETURN_PENDING" && activeHandover && (
        <HandoverCard
          handover={activeHandover}
          isGuest={isGuest}
          isHost={isHost}
          onConfirm={() => confirmHandover("RETURN")}
          isConfirming={isConfirming}
        />
      )}

      {/* COMPLETED */}
      {booking.status === "COMPLETED" && (
        <div className="glass-card p-5 border border-border">
          <div className="flex items-center gap-3">
            <Trophy size={16} className="text-gold shrink-0" />
            <div>
              <p className="font-semibold text-sm text-foreground">
                Booking Completed
              </p>
              <p className="text-foreground/40 text-xs">
                This booking has been successfully completed.
              </p>
            </div>
            {canReview && (
              <Button
                variant="outlineGold"
                size="sm"
                className="ml-auto shrink-0"
                onClick={() => setShowReviewModal(true)}
              >
                Leave Review
              </Button>
            )}
            {hasReviewed && (
              <span className="ml-auto flex items-center gap-1.5 text-xs text-green-400">
                <CheckCircle size={13} /> Reviewed
              </span>
            )}
          </div>
        </div>
      )}

      {/* Support */}
      {isActiveBooking && (isGuest || isHost) && (
        <div className="flex items-center gap-2 px-1">
          <AlertCircle size={13} className="text-foreground/30 shrink-0" />
          <p className="text-foreground/30 text-xs">
            Having issues with this booking?{" "}
            <a
              href={`mailto:support@lenda.work?subject=Booking Dispute ${booking.id}`}
              className="text-gold hover:text-gold/80 underline"
            >
              Contact support
            </a>
          </p>
        </div>
      )}

      {/* Timeline */}
      <div className="glass-card p-6 border border-border">
        <h3 className="font-display font-bold text-sm text-foreground uppercase tracking-tight mb-4">
          Timeline
        </h3>
        <GoldLine className="w-8 mb-4" />
        <div className="flex flex-col gap-3">
          {booking.history.map((event, i) => {
            const eventStatus = statusConfig[event.toStatus];
            return (
              <div key={event.id} className="flex items-start gap-3">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    i === booking.history.length - 1
                      ? "bg-gold/20 text-gold"
                      : "bg-foreground/5 text-foreground/30",
                  )}
                >
                  {eventStatus?.icon ?? <Clock size={12} />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {eventStatus?.label ?? event.toStatus}
                  </p>
                  {event.reason && (
                    <p className="text-foreground/40 text-xs">{event.reason}</p>
                  )}
                  <p className="text-foreground/30 text-xs">
                    {new Date(event.createdAt).toLocaleDateString()}{" "}
                    {new Date(event.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <div className="glass-card border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <MessageCircle size={14} className="text-foreground/40" />
          <h3 className="font-display font-bold text-sm text-foreground uppercase tracking-tight">
            Messages
          </h3>
        </div>
        <div className="flex flex-col gap-3 p-4 max-h-80 overflow-y-auto">
          {(messagesData?.messages ?? []).length === 0 ? (
            <p className="text-foreground/30 text-sm text-center py-6">
              No messages yet. Start the conversation.
            </p>
          ) : (
            (messagesData?.messages ?? []).map((msg: BookingMessage) => {
              const isMe = msg.senderId === user?.id;
              return (
                <div
                  key={msg.id}
                  className={cn("flex", isMe ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      isMe
                        ? "bg-gold text-lenda-dark font-medium rounded-br-sm"
                        : "bg-foreground/5 text-foreground/80 rounded-bl-sm",
                    )}
                  >
                    {!isMe && (
                      <p className="text-xs font-semibold mb-1 opacity-60">
                        {msg.sender?.fullName ?? "User"}
                      </p>
                    )}
                    <p>{msg.message}</p>
                    <p
                      className={cn(
                        "text-xs mt-1",
                        isMe ? "text-lenda-dark/50" : "text-foreground/30",
                      )}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
        <div className="p-3 border-t border-border flex gap-2">
          <input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (messageInput.trim()) sendMessage(messageInput);
              }
            }}
            placeholder="Type a message..."
            className="flex-1 h-10 px-4 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors focus:border-gold/60"
          />
          <button
            onClick={() => {
              if (messageInput.trim()) sendMessage(messageInput);
            }}
            disabled={!messageInput.trim() || isSending}
            className="w-10 h-10 rounded-xl bg-gold flex items-center justify-center text-lenda-dark hover:bg-gold/80 transition-colors disabled:opacity-40"
          >
            <Send size={15} />
          </button>
        </div>
      </div>

      {/* Parties */}
      <div className="glass-card p-5 border border-border">
        <h3 className="font-display font-bold text-sm text-foreground uppercase tracking-tight mb-4">
          Booking Parties
        </h3>
        <div className="flex flex-col gap-3">
          {[
            { label: "Guest", id: booking.guestId },
            { label: "Host", id: booking.hostId },
          ].map((party) => (
            <div key={party.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                <User size={14} className="text-gold" />
              </div>
              <div>
                <p className="text-xs text-foreground/40">{party.label}</p>
                <p className="text-sm text-foreground font-medium font-mono">
                  {party.id.slice(0, 8)}...
                </p>
              </div>
              {party.id === user?.id && (
                <span className="ml-auto text-xs text-gold bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20">
                  You
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
