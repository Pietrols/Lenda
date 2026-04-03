import { useState } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  ListChecks,
  CalendarDays,
  Wallet,
  Star,
  LogOut,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import AdminOverview from "./AdminOverview";
import AdminUsers from "./AdminUsers";
import AdminUserDetail from "./AdminUserDetail";
import AdminListings from "./AdminListings";
import AdminBookings from "./AdminBookings";
import AdminFloat from "./AdminFloat";
import AdminReviews from "./AdminReviews";

const navItems = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Users", href: "/admin/users", icon: Users, exact: false },
  { label: "Listings", href: "/admin/listings", icon: ListChecks, exact: false },
  { label: "Bookings", href: "/admin/bookings", icon: CalendarDays, exact: false },
  { label: "Float", href: "/admin/float", icon: Wallet, exact: false },
  { label: "Reviews", href: "/admin/reviews", icon: Star, exact: false },
];

const pageTitles: Record<string, string> = {
  "/admin": "Overview",
  "/admin/users": "User Management",
  "/admin/listings": "Listing Management",
  "/admin/bookings": "Booking Oversight",
  "/admin/float": "Float Accounts",
  "/admin/reviews": "Review Moderation",
};

type SidebarProps = {
  user: ReturnType<typeof useAuth>["user"];
  onLogout: () => void;
  onNavClick?: () => void;
  mobile?: boolean;
};

function AdminSidebar({ user, onLogout, onNavClick, mobile = false }: SidebarProps) {
  const location = useLocation();

  if (!user) return null;

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-lenda-dark border-r border-white/10",
        mobile ? "w-full" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-white/10 gap-3">
        <Link to="/">
          <span className="font-display font-black text-2xl text-white tracking-tight">
            LEN<span className="text-gold">DA</span>
          </span>
        </Link>
        <span className="text-[10px] font-body font-semibold text-gold/60 uppercase tracking-widest border border-gold/30 px-1.5 py-0.5 rounded">
          Admin
        </span>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm shrink-0">
            {user.fullName?.[0] ?? user.email?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">
              {user.fullName ?? user.email}
            </p>
            <p className="text-xs text-white/40 uppercase tracking-wider font-body">
              Administrator
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? location.pathname === item.href
            : location.pathname.startsWith(item.href);
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
              <Icon size={18} />
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

export default function AdminLayout() {
  const { user, tokens, clearAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { mutate: logout } = useMutation({
    mutationFn: () =>
      authApi.logout(tokens?.accessToken ?? "", tokens?.refreshToken ?? ""),
    onSuccess: () => {
      clearAuth();
      toast.success("Signed out successfully.");
      navigate("/");
    },
    onError: () => {
      clearAuth();
      navigate("/");
    },
  });

  const pageTitle =
    pageTitles[location.pathname] ??
    (location.pathname.startsWith("/admin/users/") ? "User Detail" : "Admin");

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <AdminSidebar user={user} onLogout={() => logout()} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 w-72">
            <AdminSidebar
              user={user}
              onLogout={() => logout()}
              onNavClick={() => setSidebarOpen(false)}
              mobile
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-background shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 text-foreground/50 hover:text-foreground"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="font-display font-bold text-lg text-foreground uppercase tracking-tight">
              {pageTitle}
            </h1>
          </div>
          <Link to="/dashboard">
            <Button variant="outlineGold" size="sm">
              User Dashboard
            </Button>
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:id" element={<AdminUserDetail />} />
            <Route path="listings" element={<AdminListings />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="float" element={<AdminFloat />} />
            <Route path="reviews" element={<AdminReviews />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
