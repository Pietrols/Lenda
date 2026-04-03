import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { api, AUTH_URL, BOOKING_URL } from "@/api/client";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  ShieldOff,
  ShieldCheck,
  Award,
  CalendarDays,
  ListChecks,
  Star,
  Clock,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AdminUserDetail = {
  id: string;
  email: string;
  fullName: string | null;
  roles: string[];
  kycStatus: string;
  isActive: boolean;
  createdAt: string;
  badges?: string[];
  bio?: string | null;
  location?: string | null;
  photoUrl?: string | null;
};

type Booking = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  totalAmount: string;
  currency: string;
  guestId?: string;
  hostId?: string;
  listing: { id?: string; title: string; category?: string };
};

type BookingsResponse = { bookings: Booking[] };

type Review = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewer?: { fullName: string | null; email: string };
  type?: string;
};

type ReviewsResponse = { reviews: Review[] };

type Listing = {
  id: string;
  title: string;
  category?: string;
  pillar?: string;
  status?: string;
  hostId?: string;
  createdAt: string;
};

type ListingsResponse = { listings: Listing[] };

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  variant: "destructive" | "gold";
  onConfirm: () => void;
};

const kycStatusConfig: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "Pending",
    className: "text-gold border-gold/30 bg-gold/10",
  },
  APPROVED: {
    label: "Approved",
    className: "text-green-400 border-green-400/30 bg-green-400/10",
  },
  REJECTED: {
    label: "Rejected",
    className: "text-destructive border-destructive/30 bg-destructive/10",
  },
  NOT_SUBMITTED: {
    label: "Not Submitted",
    className: "text-foreground/40 border-border bg-border/20",
  },
};

const bookingStatusConfig: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: "Pending",
    className: "text-yellow-500 border-yellow-500/30 bg-yellow-500/10",
    icon: <Clock size={12} />,
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "text-blue-400 border-blue-400/30 bg-blue-400/10",
    icon: <CheckCircle size={12} />,
  },
  ACTIVE: {
    label: "Active",
    className: "text-green-400 border-green-400/30 bg-green-400/10",
    icon: <CheckCircle size={12} />,
  },
  COMPLETED: {
    label: "Completed",
    className: "text-foreground/40 border-border bg-border/20",
    icon: <CheckCircle size={12} />,
  },
  CANCELLED: {
    label: "Cancelled",
    className: "text-destructive border-destructive/30 bg-destructive/10",
    icon: <XCircle size={12} />,
  },
  DISPUTED: {
    label: "Disputed",
    className: "text-orange-400 border-orange-400/30 bg-orange-400/10",
    icon: <AlertCircle size={12} />,
  },
};

const badgeSchema = z.object({
  badge: z.string().min(1, "Badge name is required"),
});
type BadgeForm = z.infer<typeof badgeSchema>;

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

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [showBadgeDialog, setShowBadgeDialog] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BadgeForm>({
    resolver: zodResolver(badgeSchema),
  });

  // Fetch user detail
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ["admin-user", id],
    queryFn: () =>
      api.get<{ user: AdminUserDetail }>(
        `/admin/users/${id}`,
        accessToken,
        AUTH_URL,
      ),
    enabled: !!accessToken && !!id,
  });

  // Fetch all bookings and filter for this user
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ["admin-user-bookings", id],
    queryFn: () =>
      api.get<BookingsResponse>("/bookings", accessToken, BOOKING_URL),
    enabled: !!accessToken && !!id,
  });

  // Fetch reviews for this user
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["admin-user-reviews", id],
    queryFn: () =>
      api.get<ReviewsResponse>(`/reviews/user/${id}`, accessToken, BOOKING_URL),
    enabled: !!accessToken && !!id,
    retry: false,
  });

  // Fetch listings and filter for this user
  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ["admin-user-listings", id],
    queryFn: () =>
      api.get<ListingsResponse>("/listings?limit=50", accessToken, BOOKING_URL),
    enabled: !!accessToken && !!id,
    retry: false,
  });

  const kycMutation = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason?: string }) =>
      api.patch(
        `/admin/users/${id}/kyc`,
        { status, reason },
        accessToken,
        AUTH_URL,
      ),
    onSuccess: () => {
      toast.success("KYC status updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to update KYC status.");
    },
  });

  const badgeMutation = useMutation({
    mutationFn: ({ badge }: { badge: string }) =>
      api.post(`/admin/users/${id}/badge`, { badge }, accessToken, AUTH_URL),
    onSuccess: () => {
      toast.success("Badge awarded successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowBadgeDialog(false);
      reset();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to award badge.");
    },
  });

  const suspendMutation = useMutation({
    mutationFn: ({ suspend }: { suspend: boolean }) =>
      api.patch(
        `/admin/users/${id}/suspend`,
        { suspend },
        accessToken,
        AUTH_URL,
      ),
    onSuccess: (_, { suspend }) => {
      toast.success(suspend ? "User suspended." : "User unsuspended.");
      queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Action failed.");
    },
  });

  const user = userData?.user;
  const allBookings = bookingsData?.bookings ?? [];
  const userBookings = allBookings.filter(
    (b) => b.guestId === id || b.hostId === id,
  );
  const reviews = reviewsData?.reviews ?? [];
  const allListings = listingsData?.listings ?? [];
  const userListings = allListings.filter((l) => l.hostId === id);

  const completedBookings = userBookings.filter(
    (b) => b.status === "COMPLETED",
  ).length;
  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        ).toFixed(1)
      : null;

  const kycCfg =
    kycStatusConfig[user?.kycStatus ?? "NOT_SUBMITTED"] ??
    kycStatusConfig.NOT_SUBMITTED;
  const isHost = user?.roles.includes("HOST");

  function handleApproveKyc() {
    setConfirmState({
      title: "Approve KYC",
      message: `Approve KYC verification for ${user?.fullName ?? user?.email}?`,
      confirmLabel: "Approve",
      variant: "gold",
      onConfirm: () => kycMutation.mutate({ status: "APPROVED" }),
    });
  }

  function handleRejectKyc() {
    setConfirmState({
      title: "Reject KYC",
      message: `Reject KYC verification for ${user?.fullName ?? user?.email}? This action will notify the user.`,
      confirmLabel: "Reject",
      variant: "destructive",
      onConfirm: () => kycMutation.mutate({ status: "REJECTED" }),
    });
  }

  function handleSuspend() {
    if (!user) return;
    if (user.isActive) {
      setConfirmState({
        title: "Suspend User",
        message: `Suspend ${user.fullName ?? user.email}? They will no longer be able to access their account.`,
        confirmLabel: "Suspend",
        variant: "destructive",
        onConfirm: () => suspendMutation.mutate({ suspend: true }),
      });
    } else {
      suspendMutation.mutate({ suspend: false });
    }
  }

  function onBadgeSubmit(values: BadgeForm) {
    badgeMutation.mutate({ badge: values.badge });
  }

  if (userLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-32 bg-foreground/10 rounded animate-pulse" />
        <div className="glass-card p-6 border border-border h-40 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="glass-card p-6 border border-border h-24 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-6">
        <button
          onClick={() => navigate("/admin/users")}
          className="flex items-center gap-2 text-sm text-foreground/50 hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft size={15} /> Back to Users
        </button>
        <div className="glass-card p-10 border border-border text-center">
          <p className="text-foreground/40 text-sm font-body">
            User not found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Back */}
      <button
        onClick={() => navigate("/admin/users")}
        className="flex items-center gap-2 text-sm text-foreground/50 hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft size={15} /> Back to Users
      </button>

      {/* Profile header */}
      <div className="glass-card p-6 border border-border">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-gold font-bold text-2xl font-display shrink-0">
            {user.fullName?.[0] ?? user.email[0].toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h2 className="font-display font-bold text-xl text-foreground uppercase tracking-tight">
                  {user.fullName ?? "No Name"}
                </h2>
                <p className="text-foreground/50 text-sm font-body mt-0.5">
                  {user.email}
                </p>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {user.roles.map((role) => (
                    <span
                      key={role}
                      className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-gold/20 text-gold/70 font-body"
                    >
                      {role}
                    </span>
                  ))}
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full border",
                      kycCfg.className,
                    )}
                  >
                    KYC: {kycCfg.label}
                  </span>
                  {!user.isActive && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full border text-destructive border-destructive/30 bg-destructive/10">
                      Suspended
                    </span>
                  )}
                </div>

                {user.badges && user.badges.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {user.badges.map((badge) => (
                      <span
                        key={badge}
                        className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-gold/30 text-gold bg-gold/5 font-body"
                      >
                        <Award size={10} /> {badge}
                      </span>
                    ))}
                  </div>
                )}

                {user.location && (
                  <p className="text-xs text-foreground/40 font-body mt-1">
                    {user.location}
                  </p>
                )}
                <p className="text-xs text-foreground/30 font-body mt-1">
                  Joined{" "}
                  {new Date(user.createdAt).toLocaleDateString("en-ZM", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              {/* Admin actions */}
              <div className="flex flex-wrap gap-2">
                {user.kycStatus === "PENDING" && (
                  <>
                    <button
                      onClick={handleApproveKyc}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-green-400/30 text-green-400 hover:bg-green-400/10 transition-colors"
                    >
                      <CheckCircle size={13} /> Approve KYC
                    </button>
                    <button
                      onClick={handleRejectKyc}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <XCircle size={13} /> Reject KYC
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setShowBadgeDialog(true);
                    reset();
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors"
                >
                  <Award size={13} /> Award Badge
                </button>
                <button
                  onClick={handleSuspend}
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors",
                    user.isActive
                      ? "border-destructive/30 text-destructive hover:bg-destructive/10"
                      : "border-green-400/30 text-green-400 hover:bg-green-400/10",
                  )}
                >
                  {user.isActive ? (
                    <>
                      <ShieldOff size={13} /> Suspend
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={13} /> Unsuspend
                    </>
                  )}
                </button>
              </div>
            </div>

            {user.bio && (
              <p className="text-sm text-foreground/60 font-body mt-3 max-w-prose">
                {user.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Bookings",
            value: bookingsLoading ? "—" : userBookings.length,
            icon: <CalendarDays size={18} />,
            accent: true,
          },
          {
            label: "Completed",
            value: bookingsLoading ? "—" : completedBookings,
            icon: <CheckCircle size={18} />,
          },
          {
            label: "Avg Rating",
            value: reviewsLoading ? "—" : (avgRating ?? "No reviews"),
            icon: <Star size={18} />,
          },
          {
            label: "Listings",
            value: listingsLoading ? "—" : userListings.length,
            icon: <ListChecks size={18} />,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={cn(
              "glass-card p-5 border transition-all duration-200",
              stat.accent ? "border-gold/30 bg-gold/5" : "border-border",
            )}
          >
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center mb-3",
                stat.accent
                  ? "bg-gold/20 text-gold"
                  : "bg-foreground/5 text-foreground/50",
              )}
            >
              {stat.icon}
            </div>
            <p className="font-display font-bold text-2xl text-foreground">
              {stat.value}
            </p>
            <p className="text-foreground/50 text-xs mt-1 font-body">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-sm uppercase tracking-tight text-foreground">
            Bookings
          </h3>
          <span className="text-xs text-foreground/40 font-body">
            {userBookings.length} total
          </span>
        </div>

        {bookingsLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="glass-card p-4 border border-border h-20 animate-pulse"
              />
            ))}
          </div>
        ) : userBookings.length === 0 ? (
          <div className="glass-card p-8 border border-border text-center">
            <CalendarDays
              size={28}
              className="text-foreground/20 mx-auto mb-2"
            />
            <p className="text-foreground/40 text-sm font-body">
              No bookings found for this user.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {userBookings.slice(0, 10).map((booking) => {
              const status = bookingStatusConfig[booking.status] ?? {
                label: booking.status,
                className: "text-foreground/40 border-border bg-border/20",
                icon: null,
              };
              const isGuest = booking.guestId === id;
              return (
                <div
                  key={booking.id}
                  className="glass-card p-4 border border-border flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {booking.listing?.title ?? "Listing"}
                    </p>
                    <p className="text-xs text-foreground/40 font-body mt-0.5">
                      Role: {isGuest ? "Guest" : "Host"} &nbsp;&middot;&nbsp;
                      {new Date(
                        booking.startDate,
                      ).toLocaleDateString()} &ndash;{" "}
                      {new Date(booking.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-gold font-body">
                      {booking.currency}{" "}
                      {Number(booking.totalAmount).toLocaleString()}
                    </span>
                    <span
                      className={cn(
                        "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border",
                        status.className,
                      )}
                    >
                      {status.icon}
                      {status.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reviews received */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-sm uppercase tracking-tight text-foreground">
            Reviews Received
          </h3>
          <span className="text-xs text-foreground/40 font-body">
            {reviews.length} total
          </span>
        </div>

        {reviewsLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="glass-card p-4 border border-border h-20 animate-pulse"
              />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="glass-card p-8 border border-border text-center">
            <Star size={28} className="text-foreground/20 mx-auto mb-2" />
            <p className="text-foreground/40 text-sm font-body">
              No reviews received yet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="glass-card p-4 border border-border"
              >
                <div className="flex items-start gap-3">
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
                    {review.reviewer && (
                      <p className="text-xs text-foreground/40 font-body mt-1.5">
                        From:{" "}
                        <span className="text-foreground/60">
                          {review.reviewer.fullName ?? review.reviewer.email}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Listings (hosts only) */}
      {isHost && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-sm uppercase tracking-tight text-foreground">
              Listings
            </h3>
            <Link
              to="/admin/listings"
              className="text-xs text-gold hover:underline font-body"
            >
              View all listings
            </Link>
          </div>

          {listingsLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="glass-card p-4 border border-border h-16 animate-pulse"
                />
              ))}
            </div>
          ) : userListings.length === 0 ? (
            <div className="glass-card p-8 border border-border text-center">
              <ListChecks
                size={28}
                className="text-foreground/20 mx-auto mb-2"
              />
              <p className="text-foreground/40 text-sm font-body">
                No listings found for this host.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {userListings.map((listing) => {
                const isActive = listing.status === "ACTIVE";
                const isSuspended = listing.status === "SUSPENDED";
                return (
                  <div
                    key={listing.id}
                    className="glass-card p-4 border border-border flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {listing.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {listing.pillar && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-gold/20 text-gold/70 font-body">
                            {listing.pillar}
                          </span>
                        )}
                        {listing.category && (
                          <span className="text-xs text-foreground/40 font-body">
                            {listing.category}
                          </span>
                        )}
                        <span className="text-xs text-foreground/30 font-body">
                          {new Date(listing.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full border shrink-0",
                        isSuspended
                          ? "text-destructive border-destructive/30 bg-destructive/10"
                          : isActive
                            ? "text-green-400 border-green-400/30 bg-green-400/10"
                            : "text-gold border-gold/30 bg-gold/10",
                      )}
                    >
                      {isSuspended
                        ? "Suspended"
                        : isActive
                          ? "Active"
                          : (listing.status ?? "Draft")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Confirm dialog */}
      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 border border-border max-w-sm w-full mx-4">
            <h3 className="font-display font-bold text-lg text-foreground uppercase tracking-tight mb-2">
              {confirmState.title}
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
                variant={
                  confirmState.variant === "destructive"
                    ? "destructive"
                    : "gold"
                }
                size="sm"
                onClick={() => {
                  confirmState.onConfirm();
                  setConfirmState(null);
                }}
              >
                {confirmState.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Badge dialog */}
      {showBadgeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 border border-border max-w-sm w-full mx-4">
            <h3 className="font-display font-bold text-lg text-foreground uppercase tracking-tight mb-2">
              Award Badge
            </h3>
            <GoldLine className="w-8 mb-4" />
            <form
              onSubmit={handleSubmit(onBadgeSubmit)}
              className="flex flex-col gap-4"
            >
              <div>
                <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-1.5 font-body">
                  Badge Name
                </label>
                <input
                  {...register("badge")}
                  placeholder="e.g. Top Host, Verified Pro"
                  className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-gold/50"
                />
                {errors.badge && (
                  <p className="text-xs text-destructive mt-1 font-body">
                    {errors.badge.message}
                  </p>
                )}
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowBadgeDialog(false);
                    reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  size="sm"
                  disabled={badgeMutation.isPending}
                >
                  {badgeMutation.isPending ? "Awarding..." : "Award Badge"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
