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
  Lock,
  Shield,
  ArrowRight,
} from "lucide-react";
import type { AuthUser } from "@/api/auth";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: ("GUEST" | "HOST" | "ADMIN")[];
  requiresKyc?: boolean;
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
    roles: ["GUEST", "HOST", "ADMIN"],
  },
  {
    label: "My Listings",
    href: "/dashboard/listings",
    icon: <ListChecks size={18} />,
    roles: ["HOST"],
    requiresKyc: true,
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
    requiresKyc: true,
  },
  {
    label: "Float",
    href: "/dashboard/float",
    icon: <Wallet size={18} />,
    roles: ["HOST"],
    requiresKyc: true,
  },
  {
    label: "Profile",
    href: "/dashboard/profile",
    icon: <User size={18} />,
    roles: ["GUEST", "HOST", "ADMIN"],
  },
];

interface DashboardSidebarProps {
  user: AuthUser | null;
  activeRole: "GUEST" | "HOST";
  onRoleChange: (role: "GUEST" | "HOST") => void;
  onLogout: () => void;
  onNavClick?: () => void;
  mobile?: boolean;
}

export function DashboardSidebar({
  user,
  activeRole,
  onRoleChange,
  onLogout,
  onNavClick,
  mobile = false,
}: DashboardSidebarProps) {
  const location = useLocation();

  if (!user) return null;

  const userRoles = (user.roles ?? []) as ("GUEST" | "HOST" | "ADMIN")[];
  const hasHostRole = userRoles.includes("HOST");
  const hasGuestRole = userRoles.includes("GUEST");
  const isAdmin = userRoles.includes("ADMIN");
  const kycApproved = user.kycStatus === "APPROVED";
  const showRoleToggle = hasHostRole && hasGuestRole && kycApproved;

  const visibleNavItems = navItems.filter((item) => {
    if (!item.roles.some((r) => userRoles.includes(r))) return false;
    if (item.roles.every((r) => r === "HOST") && activeRole !== "HOST")
      return false;
    return true;
  });

  const initials = (user.fullName ?? user.email ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-lenda-dark border-r border-white/10",
        mobile ? "w-full" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-white/10 shrink-0">
        <Link to="/" onClick={onNavClick}>
          <span className="font-display font-black text-2xl text-white tracking-tight">
            LEN<span className="text-gold">DA</span>
          </span>
        </Link>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm shrink-0 overflow-hidden">
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {user.fullName ?? user.email}
            </p>
            <p className="text-xs text-white/40 truncate">{user.email}</p>
          </div>
        </div>

        {/* Role badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {userRoles
            .filter((r) => r !== "ADMIN")
            .map((role) => (
              <span
                key={role}
                className="text-xs font-semibold px-2 py-0.5 rounded-full border border-gold/30 text-gold bg-gold/10"
              >
                {role}
              </span>
            ))}
          {isAdmin && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full border border-white/20 text-white/60 bg-white/5 flex items-center gap-1">
              <Shield size={10} />
              ADMIN
            </span>
          )}
        </div>

        {/* Role toggle */}
        {showRoleToggle && (
          <div className="mt-3 flex rounded-lg overflow-hidden border border-white/10">
            {(["GUEST", "HOST"] as const).map((role) => (
              <button
                key={role}
                onClick={() => onRoleChange(role)}
                className={cn(
                  "flex-1 text-xs font-semibold py-1.5 transition-colors",
                  activeRole === role
                    ? "bg-gold text-lenda-dark"
                    : "text-white/40 hover:text-white/70",
                )}
              >
                {role}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? location.pathname === "/dashboard"
              : location.pathname.startsWith(item.href);
          const isLocked = item.requiresKyc && !kycApproved;

          if (isLocked) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/20 cursor-not-allowed"
                title="Complete KYC verification to unlock"
              >
                <Lock size={16} className="shrink-0" />
                {item.label}
                <span className="ml-auto text-xs text-white/20">KYC</span>
              </div>
            );
          }

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
              <span className="shrink-0">{item.icon}</span>
              {item.label}
              {isActive && (
                <ChevronRight
                  size={14}
                  className="ml-auto text-gold shrink-0"
                />
              )}
            </Link>
          );
        })}

        {/* Become a Host - only for guest-only users */}
        {!hasHostRole && (
          <Link
            to="/dashboard/become-a-host"
            onClick={onNavClick}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 mt-2 border border-gold/20",
              location.pathname === "/dashboard/become-a-host"
                ? "bg-gold/15 text-gold border-gold/40"
                : "text-gold/60 hover:text-gold hover:bg-gold/5",
            )}
          >
            <ArrowRight size={18} className="shrink-0" />
            Become a Host
          </Link>
        )}

        {/* Host pending KYC notice */}
        {hasHostRole && !kycApproved && (
          <div className="mt-2 px-3 py-2.5 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
            <p className="text-xs text-yellow-500/80 font-medium">
              KYC pending review
            </p>
            <p className="text-xs text-white/30 mt-0.5">
              Listings unlock once approved
            </p>
          </div>
        )}

        {/* Admin link */}
        {isAdmin && (
          <Link
            to="/admin"
            onClick={onNavClick}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gold/60 hover:text-gold hover:bg-gold/5 transition-all duration-200 mt-2 border border-gold/10"
          >
            <Shield size={18} className="shrink-0" />
            Admin Panel
          </Link>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10 shrink-0">
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
