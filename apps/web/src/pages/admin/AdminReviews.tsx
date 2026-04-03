import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { api, BOOKING_URL } from "@/api/client";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { Star, Trash2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

type Review = {
  id: string;
  bookingId?: string;
  reviewerId?: string;
  revieweeId?: string;
  rating: number;
  comment: string;
  type?: string;
  createdAt: string;
  reviewer?: {
    id: string;
    fullName: string | null;
    email: string;
  };
  reviewee?: {
    id: string;
    fullName: string | null;
    email: string;
  };
};

type ReviewsResponse = {
  reviews: Review[];
};

type Booking = {
  id: string;
  status: string;
  listing: { title: string };
  reviews?: Review[];
};

type BookingsResponse = { bookings: Booking[] };

type ConfirmState = {
  reviewId: string;
  message: string;
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={13}
          className={i < rating ? "text-gold fill-gold" : "text-foreground/20"}
        />
      ))}
    </div>
  );
}

export default function AdminReviews() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [minRating, setMinRating] = useState("ALL");

  // Try to fetch reviews directly from admin endpoint
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: () =>
      api.get<ReviewsResponse>("/admin/reviews", accessToken, BOOKING_URL),
    enabled: !!accessToken,
    retry: false,
  });

  // Fall back to extracting reviews from bookings
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ["admin-bookings-reviews"],
    queryFn: () =>
      api.get<BookingsResponse>("/bookings", accessToken, BOOKING_URL),
    enabled: !!accessToken && !reviewsData,
  });

  const removeMutation = useMutation({
    mutationFn: (reviewId: string) =>
      api.patch(
        `/admin/reviews/${reviewId}/remove`,
        {},
        accessToken,
        BOOKING_URL,
      ),
    onSuccess: () => {
      toast.success("Review removed successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings-reviews"] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to remove review.");
    },
  });

  // Aggregate reviews from either source
  const directReviews: Review[] = reviewsData?.reviews ?? [];

  const bookingReviews: Review[] = (bookingsData?.bookings ?? []).flatMap(
    (b) => b.reviews ?? [],
  );

  const allReviews = directReviews.length > 0 ? directReviews : bookingReviews;

  const filtered = allReviews.filter((r) => {
    const matchesType = typeFilter === "ALL" || r.type === typeFilter;
    const matchesRating =
      minRating === "ALL" || r.rating <= Number(minRating);
    return matchesType && matchesRating;
  });

  const isLoading = reviewsLoading || bookingsLoading;

  function handleRemove(review: Review) {
    setConfirmState({
      reviewId: review.id,
      message: `Remove this review from ${review.reviewer?.fullName ?? "a user"}? This action cannot be undone.`,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <GoldLine className="w-10 mb-3" />
        <h2 className="font-display font-bold text-xl text-foreground uppercase tracking-tight">
          Review Moderation
        </h2>
        <p className="text-foreground/50 text-sm mt-1 font-body">
          Monitor and remove inappropriate reviews from the platform.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 text-sm bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-gold/50"
        >
          <option value="ALL">All Types</option>
          <option value="HOST_TO_GUEST">Host to Guest</option>
          <option value="GUEST_TO_HOST">Guest to Host</option>
        </select>
        <select
          value={minRating}
          onChange={(e) => setMinRating(e.target.value)}
          className="px-4 py-2 text-sm bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-gold/50"
        >
          <option value="ALL">All Ratings</option>
          <option value="1">1 Star</option>
          <option value="2">2 Stars or below</option>
          <option value="3">3 Stars or below</option>
        </select>
      </div>

      {/* Stats */}
      {!isLoading && allReviews.length > 0 && (
        <div className="flex flex-wrap gap-4">
          <div className="glass-card p-4 border border-border flex items-center gap-3">
            <MessageSquare size={18} className="text-gold" />
            <div>
              <p className="font-bold text-lg text-foreground font-display">{allReviews.length}</p>
              <p className="text-xs text-foreground/50 font-body">Total Reviews</p>
            </div>
          </div>
          <div className="glass-card p-4 border border-border flex items-center gap-3">
            <Star size={18} className="text-gold" />
            <div>
              <p className="font-bold text-lg text-foreground font-display">
                {allReviews.length > 0
                  ? (
                      allReviews.reduce((sum, r) => sum + r.rating, 0) /
                      allReviews.length
                    ).toFixed(1)
                  : "—"}
              </p>
              <p className="text-xs text-foreground/50 font-body">Avg Rating</p>
            </div>
          </div>
          <div className="glass-card p-4 border border-border flex items-center gap-3">
            <Star size={18} className="text-destructive" />
            <div>
              <p className="font-bold text-lg text-foreground font-display">
                {allReviews.filter((r) => r.rating <= 2).length}
              </p>
              <p className="text-xs text-foreground/50 font-body">Low Ratings (1–2)</p>
            </div>
          </div>
        </div>
      )}

      {/* Review list */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-card p-4 border border-border h-24 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-10 border border-border text-center">
          <MessageSquare size={36} className="text-foreground/20 mx-auto mb-3" />
          <p className="text-foreground/40 text-sm font-body">
            {allReviews.length === 0
              ? "No reviews available. Reviews appear here once bookings are completed."
              : "No reviews match your filters."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((review) => (
            <div
              key={review.id}
              className={cn(
                "glass-card p-4 border transition-all duration-200",
                review.rating <= 2 ? "border-destructive/20 bg-destructive/[0.02]" : "border-border",
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                {/* Review content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <StarRating rating={review.rating} />
                    {review.type && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-border text-foreground/40 font-body">
                        {review.type.replace(/_/g, " ")}
                      </span>
                    )}
                    <span className="text-xs text-foreground/30 font-body">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-sm text-foreground/80 font-body leading-relaxed">
                    {review.comment}
                  </p>

                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    {review.reviewer && (
                      <p className="text-xs text-foreground/40 font-body">
                        From:{" "}
                        <span className="text-foreground/60">
                          {review.reviewer.fullName ?? review.reviewer.email}
                        </span>
                      </p>
                    )}
                    {review.reviewee && (
                      <p className="text-xs text-foreground/40 font-body">
                        To:{" "}
                        <span className="text-foreground/60">
                          {review.reviewee.fullName ?? review.reviewee.email}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Remove action */}
                <button
                  onClick={() => handleRemove(review)}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                >
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm dialog */}
      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 border border-border max-w-sm w-full mx-4">
            <h3 className="font-display font-bold text-lg text-foreground uppercase tracking-tight mb-2">
              Remove Review
            </h3>
            <GoldLine className="w-8 mb-4" />
            <p className="text-foreground/60 text-sm font-body mb-6">
              {confirmState.message}
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmState(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={removeMutation.isPending}
                onClick={() => {
                  removeMutation.mutate(confirmState.reviewId);
                  setConfirmState(null);
                }}
              >
                {removeMutation.isPending ? "Removing..." : "Remove Review"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
