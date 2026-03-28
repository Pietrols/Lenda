import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { api, BOOKING_URL } from "@/api/client";
import { GoldLine } from "@/components/ui/GoldLine";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
} from "lucide-react";

type Booking = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalAmount: string;
  currency: string;
  pickupType: string;
  guestId: string;
  hostId: string;
  listing: {
    id: string;
    title: string;
    category: string;
    location: string;
    images?: { url: string }[];
  };
  history: {
    id: string;
    fromStatus: string;
    toStatus: string;
    createdAt: string;
  }[];
};

type BookingsResponse = {
  bookings: Booking[];
};

type StatusConfig = {
  label: string;
  className: string;
  icon: React.ReactNode;
};

const statusConfig: Record<string, StatusConfig> = {
  PENDING: {
    label: "Pending",
    className: "text-gold bg-gold/10 border-gold/30",
    icon: <Clock size={13} />,
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "text-foreground bg-foreground/10 border-border",
    icon: <CheckCircle size={13} />,
  },
  EN_ROUTE: {
    label: "En Route",
    className: "text-foreground bg-foreground/10 border-border",
    icon: <Clock size={13} />,
  },
  HANDED_OVER: {
    label: "Handed Over",
    className: "text-gold bg-gold/10 border-gold/30",
    icon: <CheckCircle size={13} />,
  },
  ACTIVE: {
    label: "Active",
    className: "text-gold bg-gold/10 border-gold/30",
    icon: <CheckCircle size={13} />,
  },
  RETURN_PENDING: {
    label: "Return Pending",
    className: "text-gold bg-gold/10 border-gold/30",
    icon: <Clock size={13} />,
  },
  RETURNED: {
    label: "Returned",
    className: "text-foreground bg-foreground/10 border-border",
    icon: <CheckCircle size={13} />,
  },
  COMPLETED: {
    label: "Completed",
    className: "text-foreground/40 bg-foreground/5 border-border",
    icon: <CheckCircle size={13} />,
  },
  CANCELLED: {
    label: "Cancelled",
    className: "text-destructive bg-destructive/10 border-destructive/30",
    icon: <XCircle size={13} />,
  },
  DISPUTED: {
    label: "Disputed",
    className: "text-gold bg-gold/10 border-gold/30",
    icon: <AlertCircle size={13} />,
  },
};

const filterTabs = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const activeStatuses = [
  "PENDING",
  "CONFIRMED",
  "EN_ROUTE",
  "HANDED_OVER",
  "ACTIVE",
  "RETURN_PENDING",
  "RETURNED",
];

export default function DashboardBookings() {
  const { accessToken } = useAuth();
  const [filter, setFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: () =>
      api.get<BookingsResponse>("/bookings", accessToken, BOOKING_URL),
    enabled: !!accessToken,
  });

  const bookings = data?.bookings ?? [];

  const filtered = bookings.filter((b) => {
    if (filter === "active") return activeStatuses.includes(b.status);
    if (filter === "completed") return b.status === "COMPLETED";
    if (filter === "cancelled") return b.status === "CANCELLED";
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <p className="section-label">History</p>
        <GoldLine className="w-10 mb-3" />
        <h2 className="font-display font-bold text-2xl text-foreground uppercase tracking-tight">
          Your Bookings
        </h2>
        <p className="text-foreground/50 text-sm mt-1">
          {bookings.length} booking{bookings.length !== 1 ? "s" : ""} total
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
              filter === tab.value
                ? "bg-gold text-lenda-dark"
                : "bg-background border border-border text-foreground/50 hover:text-foreground hover:border-gold/40",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings list */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass-card p-4 border border-border h-28 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 border border-border flex flex-col items-center justify-center gap-3">
          <CalendarDays size={32} className="text-foreground/20" />
          <p className="text-foreground/40 text-sm">No bookings found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((booking) => {
            const status = statusConfig[booking.status] ?? {
              label: booking.status,
              className: "text-foreground/50 bg-foreground/5 border-border",
              icon: null,
            };

            const image = booking.listing?.images?.[0]?.url;

            return (
              <div
                key={booking.id}
                className="glass-card border border-border hover:border-gold/30 transition-all duration-200"
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Listing image */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-foreground/5 shrink-0">
                    {image ? (
                      <img
                        src={image}
                        alt={booking.listing?.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <CalendarDays
                          size={20}
                          className="text-foreground/20"
                        />
                      </div>
                    )}
                  </div>

                  {/* Booking info */}
                  <div className="flex-1 overflow-hidden">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {booking.listing?.title ?? "Listing"}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin size={11} className="text-foreground/30" />
                      <p className="text-foreground/40 text-xs truncate">
                        {booking.listing?.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <CalendarDays size={11} className="text-foreground/30" />
                      <p className="text-foreground/40 text-xs">
                        {new Date(booking.startDate).toLocaleDateString()} →{" "}
                        {new Date(booking.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span
                      className={cn(
                        "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border",
                        status.className,
                      )}
                    >
                      {status.icon}
                      {status.label}
                    </span>
                    <p className="font-display font-bold text-sm text-foreground">
                      {booking.currency} {booking.totalAmount}
                    </p>
                    <Link
                      to={`/dashboard/bookings/${booking.id}`}
                      className="text-gold/70 hover:text-gold transition-colors"
                    >
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
