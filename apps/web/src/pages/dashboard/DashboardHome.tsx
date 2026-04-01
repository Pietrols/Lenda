import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { api, BOOKING_URL } from "@/api/client";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import {
  CalendarDays,
  ListChecks,
  Star,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Booking = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  totalAmount: string;
  currency: string;
  listing: {
    title: string;
    category: string;
    location: string;
  };
};

type BookingsResponse = {
  bookings: Booking[];
};

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
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
  ACTIVE: {
    label: "Active",
    color: "text-green-400",
    icon: <CheckCircle size={14} />,
  },
  COMPLETED: {
    label: "Completed",
    color: "text-white/40",
    icon: <CheckCircle size={14} />,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "text-red-400",
    icon: <XCircle size={14} />,
  },
  DISPUTED: {
    label: "Disputed",
    color: "text-orange-400",
    icon: <AlertCircle size={14} />,
  },
};

export default function DashboardHome() {
  const { user, accessToken } = useAuth();
  const isHost = user?.roles?.includes("HOST");

  const { data, isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: () =>
      api.get<BookingsResponse>("/bookings", accessToken, BOOKING_URL),
    enabled: !!accessToken,
  });

  const bookings = data?.bookings ?? [];
  const recentBookings = bookings.slice(0, 3);

  const activeBookings = bookings.filter((b) =>
    [
      "PENDING",
      "CONFIRMED",
      "EN_ROUTE",
      "HANDED_OVER",
      "ACTIVE",
      "RETURN_PENDING",
    ].includes(b.status),
  ).length;

  const completedBookings = bookings.filter(
    (b) => b.status === "COMPLETED",
  ).length;

  if (!user) return null;

  return (
    <div className="flex flex-col gap-8">
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
        <h2 className="font-display font-bold text-2xl text-foreground uppercase tracking-tight">
          Welcome back{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}
        </h2>
        <p className="text-foreground/50 text-sm mt-1">
          Here's what's happening with your account.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Active Bookings",
            value: isLoading ? "—" : activeBookings,
            icon: <CalendarDays size={20} className="text-gold" />,
            href: "/dashboard/bookings",
          },
          {
            label: "Completed",
            value: isLoading ? "—" : completedBookings,
            icon: <CheckCircle size={20} className="text-gold" />,
            href: "/dashboard/bookings",
          },
          {
            label: "KYC Status",
            value: user?.kycStatus ?? "—",
            icon: <Star size={20} className="text-gold" />,
            href: "/dashboard/profile",
          },
          ...(isHost
            ? [
                {
                  label: "My Listings",
                  value: "View",
                  icon: <ListChecks size={20} className="text-gold" />,
                  href: "/dashboard/listings",
                },
              ]
            : [
                {
                  label: "Browse",
                  value: "Explore",
                  icon: <ArrowRight size={20} className="text-gold" />,
                  href: "/listings",
                },
              ]),
        ].map((stat) => (
          <Link key={stat.label} to={stat.href}>
            <div className="glass-card p-5 border border-border hover:border-gold/40 transition-all duration-200 hover:-translate-y-0.5">
              <div className="card-icon-sm mb-3">{stat.icon}</div>
              <p className="font-display font-bold text-xl text-foreground">
                {stat.value}
              </p>
              <p className="text-foreground/50 text-xs mt-1">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-sm uppercase tracking-tight text-foreground">
            Recent Bookings
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
        ) : recentBookings.length === 0 ? (
          <div className="glass-card p-8 border border-border text-center">
            <CalendarDays
              size={32}
              className="text-foreground/20 mx-auto mb-3"
            />
            <p className="text-foreground/40 text-sm">No bookings yet</p>
            <Link to="/listings" className="mt-4 inline-block">
              <Button variant="gold" size="sm" className="gap-2 mt-4">
                Browse Listings <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentBookings.map((booking) => {
              const status = statusConfig[booking.status] ?? {
                label: booking.status,
                color: "text-white/40",
                icon: null,
              };
              return (
                <Link key={booking.id} to={`/dashboard/bookings`}>
                  <div className="glass-card p-4 border border-border hover:border-gold/30 transition-all duration-200 flex items-center justify-between gap-4">
                    <div className="overflow-hidden">
                      <p className="font-medium text-sm text-foreground truncate">
                        {booking.listing?.title ?? "Listing"}
                      </p>
                      <p className="text-foreground/40 text-xs mt-0.5">
                        {new Date(booking.startDate).toLocaleDateString()} →{" "}
                        {new Date(booking.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          "flex items-center gap-1 text-xs font-medium",
                          status.color,
                        )}
                      >
                        {status.icon}
                        {status.label}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Host CTA — only for guests */}
      {!isHost && (
        <div className="dark-section rounded-2xl p-6 relative overflow-hidden">
          <div className="grain-overlay" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="section-label">Earn on Lenda</p>
              <h3 className="font-display font-bold text-lg text-white uppercase tracking-tight mt-1">
                Become a Host
              </h3>
              <p className="text-white/50 text-sm mt-1">
                List your assets or services and start earning today.
              </p>
            </div>
            <Link to="/register">
              <Button variant="gold" size="sm" className="gap-2 shrink-0">
                Get Started <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
