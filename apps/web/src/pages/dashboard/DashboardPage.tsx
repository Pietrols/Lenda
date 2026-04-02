import { useState } from "react";
import {
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { toast } from "sonner";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DashboardSidebar } from "./DashboardSidebar";
import DashboardHome from "./DashboardHome";
import DashboardBookings from "./DashboardBookings";
import DashboardListings from "./DashboardListings";
import DashboardNotifications from "./DashboardNotifications";
import DashboardProfile from "./DashboardProfile";
import DashboardSubscription from "./DashboardSubscription";
import DashboardFloat from "./DashboardFloat";
import DashboardBookingDetail from "./DashboardBookingDetail";

const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/bookings": "Bookings",
  "/dashboard/listings": "My Listings",
  "/dashboard/notifications": "Notifications",
  "/dashboard/subscription": "Subscription",
  "/dashboard/profile": "Profile",
};

export default function DashboardPage() {
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

  const pageTitle = pageTitles[location.pathname] ?? "Dashboard";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <DashboardSidebar user={user} onLogout={() => logout()} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 w-72">
            <DashboardSidebar
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
          <Link to="/listings">
            <Button variant="outlineGold" size="sm">
              Browse Listings
            </Button>
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route index element={<DashboardHome />} />
            <Route path="bookings" element={<DashboardBookings />} />
            <Route path="listings" element={<DashboardListings />} />
            <Route path="notifications" element={<DashboardNotifications />} />
            <Route path="subscription" element={<DashboardSubscription />} />
            <Route path="profile" element={<DashboardProfile />} />
            <Route path="float" element={<DashboardFloat />} />
            <Route path="bookings/:id" element={<DashboardBookingDetail />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
