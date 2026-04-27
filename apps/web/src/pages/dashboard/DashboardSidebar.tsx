import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { api, BOOKING_URL } from "@/api/client";
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
  accessToken?: string;
  collapsed?: boolean;
  onCollapseToggle?: () => void;
}

export function DashboardSidebar({
  user,
  activeRole,
  onRoleChange,
  onLogout,
  onNavClick,
  mobile = false,
  accessToken,
  collapsed = false,
  onCollapseToggle,
}: DashboardSidebarProps) {
  const location = useLocation();

  const { data: unreadData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () =>
      api.get<{ count: number }>(
        "/notifications/unread-count",
        accessToken,
        BOOKING_URL,
      ),
    enabled: !!accessToken,
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.count ?? 0;

  if (!user) return null;

  const userRoles = (user.roles ?? []) as ("GUEST" | "HOST" | "ADMIN")[];
  const hasHostRole = userRoles.includes("HOST");
  const hasGuestRole = userRoles.includes("GUEST");
  const isAdmin = userRoles.includes("ADMIN");
  const kycApproved = user.kycStatus === "APPROVED";
  const kycRejected = user.kycStatus === "REJECTED";
  const showRoleToggle =
    hasHostRole && hasGuestRole && kycApproved && !collapsed;

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
        "flex flex-col h-full bg-lenda-dark border-r border-white/10 transition-all duration-300",
        mobile ? "w-full" : collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "h-16 flex items-center border-b border-white/10 shrink-0",
          collapsed ? "justify-center px-0" : "px-6",
        )}
      >
        <Link to="/" onClick={onNavClick}>
          <span className="font-display font-black text-2xl text-white tracking-tight">
            {collapsed ? (
              <span className="text-gold">L</span>
            ) : (
              <>
                LEN<span className="text-gold">DA</span>
              </>
            )}
          </span>
        </Link>
      </div>

      {/* User info */}
      {!collapsed && (
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
                <Shield size={10} /> ADMIN
              </span>
            )}
          </div>

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
      )}

      {/* Collapsed avatar */}
      {collapsed && (
        <div className="py-4 border-b border-white/10 shrink-0 flex justify-center">
          <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-xs overflow-hidden">
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              initials.slice(0, 1)
            )}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav
        className={cn(
          "flex-1 py-3 flex flex-col gap-0.5 overflow-y-auto",
          collapsed ? "px-2 items-center" : "px-3",
        )}
      >
        {visibleNavItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? location.pathname === "/dashboard"
              : location.pathname.startsWith(item.href);
          const isLocked = item.requiresKyc && !kycApproved;
          const isNotifications = item.href === "/dashboard/notifications";

          if (isLocked) {
            return (
              <div
                key={item.href}
                title={item.label}
                className={cn(
                  "flex items-center rounded-xl text-sm font-medium text-white/20 cursor-not-allowed",
                  collapsed ? "w-10 h-10 justify-center" : "gap-3 px-3 py-2.5",
                )}
              >
                <Lock size={16} className="shrink-0" />
                {!collapsed && item.label}
                {!collapsed && (
                  <span className="ml-auto text-xs text-white/20">KYC</span>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavClick}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-xl text-sm font-medium transition-all duration-200",
                collapsed ? "w-10 h-10 justify-center" : "gap-3 px-3 py-2.5",
                isActive
                  ? "bg-gold/15 text-gold"
                  : "text-white/50 hover:text-white hover:bg-white/5",
              )}
            >
              <span className="relative shrink-0">
                {item.icon}
                {isNotifications && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
              {!collapsed && item.label}
              {!collapsed && isActive && (
                <ChevronRight
                  size={14}
                  className="ml-auto text-gold shrink-0"
                />
              )}
            </Link>
          );
        })}

        {/* Become a Host */}
        {!hasHostRole && (
          <Link
            to="/dashboard/become-a-host"
            onClick={onNavClick}
            title={collapsed ? "Become a Host" : undefined}
            className={cn(
              "flex items-center rounded-xl text-sm font-medium transition-all duration-200 mt-2 border border-gold/20",
              collapsed ? "w-10 h-10 justify-center" : "gap-3 px-3 py-2.5",
              location.pathname === "/dashboard/become-a-host"
                ? "bg-gold/15 text-gold border-gold/40"
                : "text-gold/60 hover:text-gold hover:bg-gold/5",
            )}
          >
            <ArrowRight size={18} className="shrink-0" />
            {!collapsed && "Become a Host"}
          </Link>
        )}

        {/* KYC notices -- only when expanded */}
        {!collapsed && hasHostRole && !kycApproved && !kycRejected && (
          <div className="mt-2 px-3 py-2.5 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
            <p className="text-xs text-yellow-500/80 font-medium">
              KYC pending review
            </p>
            <p className="text-xs text-white/30 mt-0.5">
              Listings unlock once approved
            </p>
          </div>
        )}

        {!collapsed && hasHostRole && kycRejected && (
          <Link
            to="/dashboard/become-a-host"
            onClick={onNavClick}
            className="mt-2 px-3 py-2.5 rounded-xl border border-red-500/20 bg-red-500/5 block"
          >
            <p className="text-xs text-red-400 font-medium">KYC rejected</p>
            <p className="text-xs text-white/30 mt-0.5">
              Tap to resubmit documents →
            </p>
          </Link>
        )}

        {/* Admin link */}
        {isAdmin && (
          <Link
            to="/admin"
            onClick={onNavClick}
            title={collapsed ? "Admin Panel" : undefined}
            className={cn(
              "flex items-center rounded-xl text-sm font-medium text-gold/60 hover:text-gold hover:bg-gold/5 transition-all duration-200 mt-2 border border-gold/10",
              collapsed ? "w-10 h-10 justify-center" : "gap-3 px-3 py-2.5",
            )}
          >
            <Shield size={18} className="shrink-0" />
            {!collapsed && "Admin Panel"}
          </Link>
        )}
      </nav>

      {/* Collapse toggle + Logout */}
      <div
        className={cn(
          "border-t border-white/10 shrink-0",
          collapsed
            ? "px-2 py-3 flex flex-col items-center gap-2"
            : "px-3 py-4 flex flex-col gap-2",
        )}
      >
        {!mobile && onCollapseToggle && (
          <button
            onClick={onCollapseToggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex items-center rounded-xl text-sm font-medium text-white/30 hover:text-white/70 hover:bg-white/5 transition-all duration-200",
              collapsed
                ? "w-10 h-10 justify-center"
                : "gap-3 px-3 py-2.5 w-full",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
            {!collapsed && <span>Collapse</span>}
          </button>
        )}
        <button
          onClick={onLogout}
          title={collapsed ? "Sign Out" : undefined}
          className={cn(
            "flex items-center rounded-xl text-sm font-medium text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200",
            collapsed ? "w-10 h-10 justify-center" : "gap-3 px-3 py-2.5 w-full",
          )}
        >
          <LogOut size={18} />
          {!collapsed && "Sign Out"}
        </button>
      </div>
    </aside>
  );
}
