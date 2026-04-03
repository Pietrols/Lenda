import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { api, AUTH_URL, BOOKING_URL } from "@/api/client";
import { GoldLine } from "@/components/ui/GoldLine";
import {
  Users,
  ListChecks,
  CalendarDays,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AdminUsersResponse = {
  users: {
    id: string;
    email: string;
    fullName: string | null;
    roles: string[];
    kycStatus: string;
    isActive: boolean;
    createdAt: string;
  }[];
  total: number;
};

type AdminListingsResponse = {
  listings: {
    id: string;
    title: string;
    status: string;
    isVerified: boolean;
    isSuspended: boolean;
  }[];
  total?: number;
};

type Booking = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  totalAmount: string;
  currency: string;
  listing: { title: string; category: string };
  guest?: { fullName: string | null; email: string };
  host?: { fullName: string | null; email: string };
};

type BookingsResponse = { bookings: Booking[] };

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

function StatCard({
  label,
  value,
  icon,
  loading,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  loading?: boolean;
  accent?: boolean;
}) {
  if (loading) {
    return (
      <div className="glass-card p-6 border border-border h-28 animate-pulse" />
    );
  }
  return (
    <div
      className={cn(
        "glass-card p-6 border transition-all duration-200",
        accent ? "border-gold/30 bg-gold/5" : "border-border",
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center",
            accent
              ? "bg-gold/20 text-gold"
              : "bg-foreground/5 text-foreground/50",
          )}
        >
          {icon}
        </div>
      </div>
      <p className="font-display font-bold text-2xl text-foreground">{value}</p>
      <p className="text-foreground/50 text-xs mt-1 font-body">{label}</p>
    </div>
  );
}

export default function AdminOverview() {
  const { accessToken } = useAuth();

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users-overview"],
    queryFn: () =>
      api.get<AdminUsersResponse>(
        "/admin/users?limit=1000",
        accessToken,
        AUTH_URL,
      ),
    enabled: !!accessToken,
  });

  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ["admin-listings-overview"],
    queryFn: () =>
      api.get<AdminListingsResponse>(
        "/admin/listings",
        accessToken,
        BOOKING_URL,
      ),
    enabled: !!accessToken,
  });

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ["admin-bookings-overview"],
    queryFn: () =>
      api.get<BookingsResponse>("/bookings", accessToken, BOOKING_URL),
    enabled: !!accessToken,
  });

  const users = usersData?.users ?? [];
  const totalUsers = usersData?.total ?? users.length;
  const totalHosts = users.filter((u) => u.roles.includes("HOST")).length;
  const totalGuests = users.filter((u) => u.roles.includes("GUEST")).length;

  const listings = listingsData?.listings ?? [];
  const totalListings = listingsData?.total ?? listings.length;
  const activeListings = listings.filter(
    (l) => l.isVerified && !l.isSuspended,
  ).length;

  const bookings = bookingsData?.bookings ?? [];
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter(
    (b) => b.status === "COMPLETED",
  ).length;

  const recentBookings = bookings.slice(0, 10);

  const isLoading = usersLoading || listingsLoading || bookingsLoading;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <p className="text-xs font-body font-semibold uppercase tracking-widest text-foreground/40 mb-2">
          {new Date().toLocaleDateString("en-ZM", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <GoldLine className="w-10 mb-3" />
        <h2 className="font-display font-bold text-2xl text-foreground uppercase tracking-tight">
          Platform Overview
        </h2>
        <p className="text-foreground/50 text-sm mt-1 font-body">
          Real-time summary of Lenda marketplace activity.
        </p>
      </div>

      {/* Stats — Users */}
      <div>
        <h3 className="font-display font-bold text-xs uppercase tracking-widest text-foreground/40 mb-3">
          Users
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            label="Total Users"
            value={usersLoading ? "—" : totalUsers}
            icon={<Users size={18} />}
            loading={false}
            accent
          />
          <StatCard
            label="Total Hosts"
            value={usersLoading ? "—" : totalHosts}
            icon={<Users size={18} />}
          />
          <StatCard
            label="Total Guests"
            value={usersLoading ? "—" : totalGuests}
            icon={<Users size={18} />}
          />
        </div>
      </div>

      {/* Stats — Listings */}
      <div>
        <h3 className="font-display font-bold text-xs uppercase tracking-widest text-foreground/40 mb-3">
          Listings
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Total Listings"
            value={listingsLoading ? "—" : totalListings}
            icon={<ListChecks size={18} />}
            accent
          />
          <StatCard
            label="Active &amp; Verified"
            value={listingsLoading ? "—" : activeListings}
            icon={<ListChecks size={18} />}
          />
        </div>
      </div>

      {/* Stats — Bookings */}
      <div>
        <h3 className="font-display font-bold text-xs uppercase tracking-widest text-foreground/40 mb-3">
          Bookings
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Total Bookings"
            value={bookingsLoading ? "—" : totalBookings}
            icon={<CalendarDays size={18} />}
            accent
          />
          <StatCard
            label="Completed Bookings"
            value={bookingsLoading ? "—" : completedBookings}
            icon={<CheckCircle size={18} />}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-sm uppercase tracking-tight text-foreground">
            Recent Bookings
          </h3>
          <span className="text-xs text-foreground/40 font-body">Last 10</span>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="glass-card p-4 border border-border h-20 animate-pulse"
              />
            ))}
          </div>
        ) : recentBookings.length === 0 ? (
          <div className="glass-card p-8 border border-border text-center">
            <CalendarDays
              size={32}
              className="text-foreground/20 mx-auto mb-3"
            />
            <p className="text-foreground/40 text-sm font-body">
              No bookings yet
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentBookings.map((booking) => {
              const status = statusConfig[booking.status] ?? {
                label: booking.status,
                className: "text-foreground/40 border-border bg-border/20",
                icon: null,
              };
              return (
                <div
                  key={booking.id}
                  className="glass-card p-4 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="overflow-hidden">
                    <p className="font-medium text-sm text-foreground truncate">
                      {booking.listing?.title ?? "Listing"}
                    </p>
                    <p className="text-foreground/40 text-xs mt-0.5 font-body">
                      {booking.guest?.fullName ??
                        booking.guest?.email ??
                        "Guest"}{" "}
                      &rarr;{" "}
                      {booking.host?.fullName ?? booking.host?.email ?? "Host"}
                    </p>
                    <p className="text-foreground/30 text-xs font-body">
                      {new Date(booking.startDate).toLocaleDateString()} &ndash;{" "}
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
    </div>
  );
}
