import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { api, BOOKING_URL } from "@/api/client";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  ListChecks,
  Star,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Wallet,
  Plus,
  Bell,
} from "lucide-react";

type Booking = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  totalAmount: string;
  currency: string;
  guestId: string;
  hostId: string;
  listing: {
    title: string;
    location: string;
    images?: { url: string }[];
  };
};

type BookingsResponse = {
  bookings: Booking[];
};

type NotificationsResponse = {
  notifications: { id: string; isRead: boolean }[];
};

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: "Pending",
    color: "text-yellow-500",
    icon: <Clock size={13} />,
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "text-blue-400",
    icon: <CheckCircle size={13} />,
  },
  EN_ROUTE: {
    label: "En Route",
    color: "text-blue-400",
    icon: <Clock size={13} />,
  },
  HANDED_OVER: {
    label: "Handed Over",
    color: "text-gold",
    icon: <CheckCircle size={13} />,
  },
  ACTIVE: {
    label: "Active",
    color: "text-green-400",
    icon: <CheckCircle size={13} />,
  },
  RETURN_PENDING: {
    label: "Return Pending",
    color: "text-yellow-500",
    icon: <Clock size={13} />,
  },
  RETURNED: {
    label: "Returned",
    color: "text-foreground/60",
    icon: <CheckCircle size={13} />,
  },
  COMPLETED: {
    label: "Completed",
    color: "text-foreground/40",
    icon: <CheckCircle size={13} />,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "text-red-400",
    icon: <XCircle size={13} />,
  },
  DISPUTED: {
    label: "Disputed",
    color: "text-orange-400",
    icon: <AlertCircle size={13} />,
  },
};

const activeStatuses = [
  "PENDING",
  "CONFIRMED",
  "EN_ROUTE",
  "HANDED_OVER",
  "ACTIVE",
  "RETURN_PENDING",
];

interface DashboardHomeProps {
  activeRole: "GUEST" | "HOST";
}

export default function DashboardHome({ activeRole }: DashboardHomeProps) {
  const { user, accessToken } = useAuth();
  const kycApproved = user?.kycStatus === "APPROVED";
  const hasHostRole = user?.roles?.includes("HOST") ?? false;
  const isHostView = activeRole === "HOST" && hasHostRole && kycApproved;

  const { data, isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: () =>
      api.get<BookingsResponse>("/bookings", accessToken, BOOKING_URL),
    enabled: !!accessToken,
  });

  const { data: notifData } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () =>
      api.get<NotificationsResponse>(
        "/notifications",
        accessToken,
        BOOKING_URL,
      ),
    enabled: !!accessToken,
  });

  const bookings = data?.bookings ?? [];
  const unreadCount = (notifData?.notifications ?? []).filter(
    (n) => !n.isRead,
  ).length;

  const activeBookings = bookings.filter((b) =>
    activeStatuses.includes(b.status),
  );
  const completedBookings = bookings.filter((b) => b.status === "COMPLETED");

  const guestBookings = bookings.filter((b) => b.guestId === user?.id);
  const hostBookings = bookings.filter((b) => b.hostId === user?.id);

  const displayBookings = isHostView
    ? hostBookings.slice(0, 3)
    : guestBookings.slice(0, 3);

  const firstName = user?.fullName?.split(" ")[0] ?? "";

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Welcome */}
      <div>
        <p className="section-label">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <GoldLine className="w-10 mb-3" />
        <h2 className="font-display font-bold text-xl md:text-2xl text-foreground uppercase tracking-tight">
          Welcome back{firstName ? `, ${firstName}` : ""}
        </h2>
        <p className="text-foreground/50 text-sm mt-1">
          {isHostView
            ? "Here's what's happening with your listings."
            : "Here's what's happening with your bookings."}
        </p>
      </div>

      {/* KYC pending banner */}
      {hasHostRole && !kycApproved && (
        <div className="glass-card p-4 border border-yellow-500/30 bg-yellow-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-sm text-yellow-500">
              Host account pending KYC verification
            </p>
            <p className="text-foreground/50 text-xs mt-0.5">
              Upload your verification documents to unlock listing creation.
            </p>
          </div>
          <Link to="/dashboard/profile" className="shrink-0">
            <Button variant="outlineGold" size="sm" className="gap-2">
              Complete KYC <ArrowRight size={13} />
            </Button>
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {isHostView ? (
          <>
            <StatCard
              label="Active Bookings"
              value={
                isLoading
                  ? "—"
                  : hostBookings.filter((b) =>
                      activeStatuses.includes(b.status),
                    ).length
              }
              icon={<CalendarDays size={20} className="text-gold" />}
              href="/dashboard/bookings"
            />
            <StatCard
              label="Total Bookings"
              value={isLoading ? "—" : hostBookings.length}
              icon={<CheckCircle size={20} className="text-gold" />}
              href="/dashboard/bookings"
            />
            <StatCard
              label="My Listings"
              value="Manage"
              icon={<ListChecks size={20} className="text-gold" />}
              href="/dashboard/listings"
            />
            <StatCard
              label="Float Balance"
              value="View"
              icon={<Wallet size={20} className="text-gold" />}
              href="/dashboard/float"
            />
          </>
        ) : (
          <>
            <StatCard
              label="Active Bookings"
              value={isLoading ? "—" : activeBookings.length}
              icon={<CalendarDays size={20} className="text-gold" />}
              href="/dashboard/bookings"
            />
            <StatCard
              label="Completed"
              value={isLoading ? "—" : completedBookings.length}
              icon={<CheckCircle size={20} className="text-gold" />}
              href="/dashboard/bookings"
            />
            <StatCard
              label="KYC Status"
              value={user.kycStatus ?? "—"}
              icon={<Star size={20} className="text-gold" />}
              href="/dashboard/profile"
            />
            <StatCard
              label={
                unreadCount > 0 ? `${unreadCount} Unread` : "Notifications"
              }
              value={unreadCount > 0 ? "View" : "All read"}
              icon={<Bell size={20} className="text-gold" />}
              href="/dashboard/notifications"
            />
          </>
        )}
      </div>

      {/* Recent bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-sm uppercase tracking-tight text-foreground">
            {isHostView ? "Recent Booking Requests" : "Recent Bookings"}
          </h3>
          <Link to="/dashboard/bookings" className="lenda-link text-xs">
            View all <ArrowRight size={13} />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="glass-card p-4 border border-border h-20 animate-pulse"
              />
            ))}
          </div>
        ) : displayBookings.length === 0 ? (
          <div className="glass-card p-8 border border-border text-center">
            <CalendarDays
              size={32}
              className="text-foreground/20 mx-auto mb-3"
            />
            <p className="text-foreground/40 text-sm">No bookings yet</p>
            {!isHostView && (
              <Link to="/listings" className="mt-4 inline-block">
                <Button variant="gold" size="sm" className="gap-2 mt-4">
                  Browse Listings <ArrowRight size={14} />
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayBookings.map((booking) => {
              const status = statusConfig[booking.status] ?? {
                label: booking.status,
                color: "text-foreground/40",
                icon: null,
              };
              const image = booking.listing?.images?.[0]?.url;

              return (
                <Link key={booking.id} to={`/dashboard/bookings/${booking.id}`}>
                  <div className="glass-card p-4 border border-border hover:border-gold/30 transition-all duration-200 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-foreground/5 shrink-0">
                      {image ? (
                        <img
                          src={image}
                          alt={booking.listing?.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <CalendarDays
                            size={16}
                            className="text-foreground/20"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-medium text-sm text-foreground truncate">
                        {booking.listing?.title ?? "Listing"}
                      </p>
                      <p className="text-foreground/40 text-xs mt-0.5">
                        {new Date(booking.startDate).toLocaleDateString()} →{" "}
                        {new Date(booking.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className={cn(
                          "flex items-center gap-1 text-xs font-medium",
                          status.color,
                        )}
                      >
                        {status.icon}
                        <span className="hidden sm:inline">{status.label}</span>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Become a Host CTA — guest only */}
      {!hasHostRole && (
        <div className="dark-section rounded-2xl p-6 relative overflow-hidden">
          <div className="grain-overlay" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="section-label">Earn on Lenda</p>
              <h3 className="font-display font-bold text-lg text-white uppercase tracking-tight mt-1">
                Become a Host
              </h3>
              <p className="text-white/50 text-sm mt-1">
                List your assets or services and start earning today.
              </p>
            </div>
            <Link to="/dashboard/become-a-host" className="shrink-0">
              <Button variant="gold" size="sm" className="gap-2">
                Get Started <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Host quick action */}
      {isHostView && (
        <div className="dark-section rounded-2xl p-6 relative overflow-hidden">
          <div className="grain-overlay" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="section-label">Listings</p>
              <h3 className="font-display font-bold text-lg text-white uppercase tracking-tight mt-1">
                Add a New Listing
              </h3>
              <p className="text-white/50 text-sm mt-1">
                List a rental or service to start receiving bookings.
              </p>
            </div>
            <Link to="/dashboard/listings" className="shrink-0">
              <Button variant="gold" size="sm" className="gap-2">
                <Plus size={14} /> New Listing
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link to={href}>
      <div className="glass-card p-4 border border-border hover:border-gold/40 transition-all duration-200 hover:-translate-y-0.5">
        <div className="card-icon-sm mb-3">{icon}</div>
        <p className="font-display font-bold text-xl text-foreground">
          {value}
        </p>
        <p className="text-foreground/50 text-xs mt-1">{label}</p>
      </div>
    </Link>
  );
}
