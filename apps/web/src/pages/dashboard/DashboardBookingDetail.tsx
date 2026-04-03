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
} from "lucide-react";

type BookingHistory = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedById: string;
  reason: string | null;
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
  listing: {
    id: string;
    title: string;
    category: string;
    location: string;
    pricePerDay: string;
    images: { url: string; isPrimary: boolean; order: number }[];
  };
  history: BookingHistory[];
  handovers: {
    id: string;
    type: string;
    guestConfirmed: boolean;
    hostConfirmed: boolean;
    createdAt: string;
  }[];
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

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: "Pending",
    color: "text-gold",
    icon: <Clock size={14} />,
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "text-foreground",
    icon: <CheckCircle size={14} />,
  },
  EN_ROUTE: {
    label: "En Route",
    color: "text-foreground",
    icon: <Clock size={14} />,
  },
  HANDED_OVER: {
    label: "Handed Over",
    color: "text-gold",
    icon: <CheckCircle size={14} />,
  },
  ACTIVE: {
    label: "Active",
    color: "text-gold",
    icon: <CheckCircle size={14} />,
  },
  RETURN_PENDING: {
    label: "Return Pending",
    color: "text-gold",
    icon: <Clock size={14} />,
  },
  RETURNED: {
    label: "Returned",
    color: "text-foreground",
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
    color: "text-gold",
    icon: <AlertCircle size={14} />,
  },
};

const reviewSchema = z.object({
  rating: z.coerce.number().min(1).max(5),
  comment: z
    .string()
    .min(10, "Comment must be at least 10 characters")
    .optional(),
});

type ReviewForm = z.infer<typeof reviewSchema>;

export default function DashboardBookingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [messageInput, setMessageInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesData]);

  const { data, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: () =>
      api.get<{ booking: Booking }>(
        `/bookings/${id}`,
        accessToken,
        BOOKING_URL,
      ),
    enabled: !!id && !!accessToken,
  });

  const { data: reviewsData } = useQuery({
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

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ReviewForm>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 5 },
  });

  const rating = useWatch({ control, name: "rating" });

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
      toast.success("Booking status updated.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { mutate: submitReview, isPending: isReviewing } = useMutation({
    mutationFn: (data: ReviewForm) =>
      api.post<{ review: Review }>(
        "/reviews",
        { bookingId: id, ...data },
        accessToken,
        BOOKING_URL,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-reviews", id] });
      toast.success("Review submitted.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const booking = data?.booking;
  const reviews = reviewsData?.reviews ?? [];

  const isGuest = user?.id === booking?.guestId;
  const isHost = user?.id === booking?.hostId;

  const myReviewType = isGuest ? "GUEST_TO_HOST" : "HOST_TO_GUEST";
  const hasReviewed = reviews.some(
    (r) => r.reviewerId === user?.id && r.type === myReviewType,
  );

  const canReview =
    booking?.status === "COMPLETED" && (isGuest || isHost) && !hasReviewed;

  const primaryImage =
    booking?.listing.images?.find((i) => i.isPrimary)?.url ??
    booking?.listing.images?.[0]?.url;

  const status = booking ? statusConfig[booking.status] : null;

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
              "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border shrink-0",
              status.color,
              "border-current/20 bg-current/5",
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
                {new Date(booking.startDate).toLocaleDateString()} →{" "}
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
          <p className="text-foreground/50 text-sm">
            {booking.currency} {booking.listing.pricePerDay} x{" "}
            {booking.totalDays} day{booking.totalDays !== 1 ? "s" : ""}
          </p>
          <p className="font-display font-bold text-foreground">
            {booking.currency} {booking.totalAmount}
          </p>
        </div>

        {booking.notes && (
          <div className="border-t border-border p-4">
            <p className="text-micro text-foreground/50 mb-1">Notes</p>
            <p className="text-sm text-foreground/60">{booking.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {booking.status === "PENDING" && isHost && (
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
            >
              Decline
            </Button>
          </div>
        </div>
      )}

      {booking.status === "CONFIRMED" && (isGuest || isHost) && (
        <div className="glass-card p-5 border border-border flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm text-foreground mb-0.5">
              Ready to start?
            </p>
            <p className="text-foreground/40 text-xs">
              {isHost
                ? "Mark as en route when heading to the guest."
                : "Confirm when the host is on their way."}
            </p>
          </div>
          <Button
            variant="outlineGold"
            size="sm"
            disabled={isTransitioning}
            onClick={() => transitionStatus("EN_ROUTE")}
          >
            Mark En Route
          </Button>
        </div>
      )}

      {booking.status === "ACTIVE" && (isGuest || isHost) && (
        <div className="glass-card p-5 border border-border flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm text-foreground mb-0.5">
              Ready to complete?
            </p>
            <p className="text-foreground/40 text-xs">
              Mark as complete once the booking is finished.
            </p>
          </div>
          <Button
            variant="outlineGold"
            size="sm"
            disabled={isTransitioning}
            onClick={() => transitionStatus("COMPLETED")}
          >
            Complete
          </Button>
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
                    i === 0
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
        <div className="px-5 py-4 border-b border-border">
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

      {/* Review form */}
      {canReview && (
        <div className="glass-card p-6 border border-gold/20">
          <h3 className="font-display font-bold text-sm text-foreground uppercase tracking-tight mb-1">
            {isGuest ? "Review the Host" : "Review the Guest"}
          </h3>
          <GoldLine className="w-8 mb-4" />
          <p className="text-foreground/50 text-sm mb-5">
            {isGuest
              ? "Share your experience with this host to help others make informed decisions."
              : "Leave feedback about the guest to help other hosts."}
          </p>

          <form
            onSubmit={handleSubmit((d) => submitReview(d))}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-micro text-foreground/60">Rating</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <label key={star} className="cursor-pointer">
                    <input
                      type="radio"
                      value={star}
                      {...register("rating")}
                      className="sr-only"
                    />
                    <Star
                      size={24}
                      className={cn(
                        "transition-colors",
                        star <= Number(rating)
                          ? "text-gold fill-gold"
                          : "text-foreground/20",
                      )}
                    />
                  </label>
                ))}
                <span className="text-foreground/40 text-sm ml-1">
                  {rating}/5
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-micro text-foreground/60">
                Comment (optional)
              </label>
              <textarea
                {...register("comment")}
                rows={3}
                placeholder={
                  isGuest
                    ? "How was your experience with this host?"
                    : "How was this guest to work with?"
                }
                className={cn(
                  "w-full px-4 py-3 rounded-xl bg-background border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors focus:border-gold/60 resize-none",
                  errors.comment ? "border-destructive/60" : "border-border",
                )}
              />
              {errors.comment && (
                <p className="text-destructive text-xs">
                  {errors.comment.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="gold"
              size="md"
              className="gap-2 self-start"
              disabled={isReviewing}
            >
              <Star size={15} />
              {isReviewing ? "Submitting..." : "Submit Review"}
            </Button>
          </form>
        </div>
      )}

      {hasReviewed && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-foreground/5 border border-border">
          <CheckCircle size={16} className="text-gold shrink-0" />
          <p className="text-foreground/60 text-sm">
            You have already submitted your review for this booking.
          </p>
        </div>
      )}

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
