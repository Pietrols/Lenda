import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  ListChecks,
  Bell,
  User,
  CreditCard,
  LogOut,
  ChevronRight,
  Wallet,
} from "lucide-react";
import type { AuthUser } from "@/api/auth";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
};

const navItems: NavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: <LayoutDashboard size={18} />,
    roles: ["GUEST", "HOST", "ADMIN"],
  },
  {
    label: "Bookings",
    href: "/dashboard/bookings",
    icon: <CalendarDays size={18} />,
    roles: ["GUEST", "HOST"],
  },
  {
    label: "My Listings",
    href: "/dashboard/listings",
    icon: <ListChecks size={18} />,
    roles: ["HOST"],
  },
  {
    label: "Notifications",
    href: "/dashboard/notifications",
    icon: <Bell size={18} />,
    roles: ["GUEST", "HOST", "ADMIN"],
  },
  {
    label: "Subscription",
    href: "/dashboard/subscription",
    icon: <CreditCard size={18} />,
    roles: ["HOST"],
  },
  {
    label: "Profile",
    href: "/dashboard/profile",
    icon: <User size={18} />,
    roles: ["GUEST", "HOST", "ADMIN"],
  },
  {
    label: "Float",
    href: "/dashboard/float",
    icon: <Wallet size={18} />,
    roles: ["HOST"],
  },
];

interface DashboardSidebarProps {
  user: AuthUser | null;
  onLogout: () => void;
  onNavClick?: () => void;
  mobile?: boolean;
}

export function DashboardSidebar({
  user,
  onLogout,
  onNavClick,
  mobile = false,
}: DashboardSidebarProps) {
  const location = useLocation();

  if (!user) return null;

  const userRoles = user?.roles ?? [];

  const visibleNavItems = navItems.filter((item) =>
    item.roles.some((role) => userRoles.includes(role)),
  );

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-lenda-dark border-r border-white/10",
        mobile ? "w-full" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <Link to="/">
          <span className="font-display font-black text-2xl text-white tracking-tight">
            LEN<span className="text-gold">DA</span>
          </span>
        </Link>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm shrink-0">
            {user?.fullName?.[0] ?? user?.email?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">
              {user?.fullName ?? user?.email}
            </p>
            <p className="text-xs text-white/40 capitalize">
              {userRoles[0]?.toLowerCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {visibleNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gold/15 text-gold"
                  : "text-white/50 hover:text-white hover:bg-white/5",
              )}
            >
              {item.icon}
              {item.label}
              {isActive && (
                <ChevronRight size={14} className="ml-auto text-gold" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 w-full"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
