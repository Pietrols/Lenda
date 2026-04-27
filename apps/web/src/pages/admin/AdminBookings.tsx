import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { api, BOOKING_URL } from "@/api/client";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

type BookingGuest = {
  id: string;
  fullName: string | null;
  email: string;
};

type BookingHost = {
  id: string;
  fullName: string | null;
  email: string;
};

type BookingListing = {
  id?: string;
  title: string;
  category?: string;
  location?: string;
};

type Booking = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  totalAmount: string;
  currency: string;
  listing: BookingListing;
  guest?: BookingGuest;
  host?: BookingHost;
  notes?: string;
  createdAt?: string;
};

type BookingsResponse = { bookings: Booking[] };

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  variant: "destructive" | "gold";
  onConfirm: () => void;
};

const statusConfig: Record<
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
  EN_ROUTE: {
    label: "En Route",
    className: "text-blue-400 border-blue-400/30 bg-blue-400/10",
    icon: <Clock size={12} />,
  },
  HANDED_OVER: {
    label: "Handed Over",
    className: "text-green-400 border-green-400/30 bg-green-400/10",
    icon: <CheckCircle size={12} />,
  },
  ACTIVE: {
    label: "Active",
    className: "text-green-400 border-green-400/30 bg-green-400/10",
    icon: <CheckCircle size={12} />,
  },
  RETURN_PENDING: {
    label: "Return Pending",
    className: "text-yellow-500 border-yellow-500/30 bg-yellow-500/10",
    icon: <Clock size={12} />,
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

const ALL_STATUSES = Object.keys(statusConfig);

function BookingRow({
  booking,
  onAction,
}: {
  booking: Booking;
  onAction: (booking: Booking, newStatus: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = statusConfig[booking.status] ?? {
    label: booking.status,
    className: "text-foreground/40 border-border bg-border/20",
    icon: null,
  };

  return (
    <div className="glass-card border border-border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex flex-col sm:flex-row sm:items-center gap-3 text-left hover:bg-gold/[0.03] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">
            {booking.listing?.title ?? "Listing"}
          </p>
          <p className="text-xs text-foreground/50 font-body mt-0.5">
            {booking.guest?.fullName ?? booking.guest?.email ?? "Guest"} &rarr;{" "}
            {booking.host?.fullName ?? booking.host?.email ?? "Host"}
          </p>
          <p className="text-xs text-foreground/30 font-body mt-0.5">
            {new Date(booking.startDate).toLocaleDateString()} &ndash;{" "}
            {new Date(booking.endDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-semibold text-gold font-body">
            {booking.currency} {Number(booking.totalAmount).toLocaleString()}
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
          {expanded ? (
            <ChevronUp size={14} className="text-foreground/30" />
          ) : (
            <ChevronDown size={14} className="text-foreground/30" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3 flex flex-col gap-3">
          {/* Detail rows */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-body">
            <div>
              <p className="text-foreground/40 uppercase tracking-wider text-[10px] mb-0.5">
                Booking ID
              </p>
              <p className="text-foreground/70 font-mono text-[11px] truncate">
                {booking.id}
              </p>
            </div>
            {booking.listing?.category && (
              <div>
                <p className="text-foreground/40 uppercase tracking-wider text-[10px] mb-0.5">
                  Category
                </p>
                <p className="text-foreground/70">{booking.listing.category}</p>
              </div>
            )}
            {booking.listing?.location && (
              <div>
                <p className="text-foreground/40 uppercase tracking-wider text-[10px] mb-0.5">
                  Location
                </p>
                <p className="text-foreground/70">{booking.listing.location}</p>
              </div>
            )}
            {booking.createdAt && (
              <div>
                <p className="text-foreground/40 uppercase tracking-wider text-[10px] mb-0.5">
                  Created
                </p>
                <p className="text-foreground/70">
                  {new Date(booking.createdAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Admin actions */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-xs text-foreground/40 font-body mr-1">
              Admin actions:
            </span>
            {booking.status === "DISPUTED" && (
              <button
                onClick={() => onAction(booking, "COMPLETED")}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-green-400/30 text-green-400 hover:bg-green-400/10 transition-colors"
              >
                <CheckCircle size={12} /> Resolve &amp; Complete
              </button>
            )}
            {!["COMPLETED", "CANCELLED"].includes(booking.status) && (
              <button
                onClick={() => onAction(booking, "CANCELLED")}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
              >
                <XCircle size={12} /> Cancel Booking
              </button>
            )}
            {booking.status === "PENDING" && (
              <button
                onClick={() => onAction(booking, "CONFIRMED")}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-400/30 text-blue-400 hover:bg-blue-400/10 transition-colors"
              >
                <CheckCircle size={12} /> Confirm
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminBookings() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const [searchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") ?? "ALL",
  );
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: () =>
      api.get<BookingsResponse>("/bookings", accessToken, BOOKING_URL),
    enabled: !!accessToken,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/bookings/${id}/status`, { status }, accessToken, BOOKING_URL),
    onSuccess: () => {
      toast.success("Booking status updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to update booking.");
    },
  });

  const allBookings = data?.bookings ?? [];

  const filtered =
    statusFilter === "ALL"
      ? allBookings
      : allBookings.filter((b) => b.status === statusFilter);

  function handleAction(booking: Booking, newStatus: string) {
    const isCancel = newStatus === "CANCELLED";
    setConfirmState({
      title: isCancel ? "Cancel Booking" : "Update Booking Status",
      message: isCancel
        ? `Cancel booking for "${booking.listing?.title ?? "this listing"}"? This cannot be undone.`
        : `Mark booking for "${booking.listing?.title ?? "this listing"}" as ${newStatus.toLowerCase()}?`,
      confirmLabel: isCancel ? "Cancel Booking" : "Confirm",
      variant: isCancel ? "destructive" : "gold",
      onConfirm: () =>
        statusMutation.mutate({ id: booking.id, status: newStatus }),
    });
  }

  const disputedCount = allBookings.filter(
    (b) => b.status === "DISPUTED",
  ).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <GoldLine className="w-10 mb-3" />
        <h2 className="font-display font-bold text-xl text-foreground uppercase tracking-tight">
          Booking Oversight
        </h2>
        <p className="text-foreground/50 text-sm mt-1 font-body">
          Monitor all platform bookings and resolve disputes.
        </p>
      </div>

      {/* Dispute alert */}
      {disputedCount > 0 && (
        <div className="glass-card p-4 border border-orange-400/30 bg-orange-400/5">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="text-orange-400 shrink-0" />
            <p className="text-sm font-medium text-orange-400">
              {disputedCount} disputed booking{disputedCount > 1 ? "s" : ""}{" "}
              require{disputedCount === 1 ? "s" : ""} attention.
            </p>
            <button
              onClick={() => setStatusFilter("DISPUTED")}
              className="ml-auto text-xs font-semibold text-orange-400 hover:underline"
            >
              View disputes
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors",
              statusFilter === "ALL"
                ? "bg-gold/15 border-gold/30 text-gold"
                : "border-border text-foreground/50 hover:border-gold/20 hover:text-foreground",
            )}
          >
            All ({allBookings.length})
          </button>
          {ALL_STATUSES.map((s) => {
            const count = allBookings.filter((b) => b.status === s).length;
            if (count === 0) return null;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors",
                  statusFilter === s
                    ? "bg-gold/15 border-gold/30 text-gold"
                    : "border-border text-foreground/50 hover:border-gold/20 hover:text-foreground",
                )}
              >
                {statusConfig[s]?.label ?? s} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="glass-card p-4 border border-border h-24 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-10 border border-border text-center">
          <CalendarDays size={36} className="text-foreground/20 mx-auto mb-3" />
          <p className="text-foreground/40 text-sm font-body">
            No bookings found.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              onAction={handleAction}
            />
          ))}
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
    </div>
  );
}
