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
import { ThemeToggle } from "@/components/ThemeToggle";
import { DashboardSidebar } from "./DashboardSidebar";
import DashboardHome from "./DashboardHome";
import DashboardBookings from "./DashboardBookings";
import DashboardBookingDetail from "./DashboardBookingDetail";
import DashboardListings from "./DashboardListings";
import DashboardNotifications from "./DashboardNotifications";
import DashboardProfile from "./DashboardProfile";
import DashboardSubscription from "./DashboardSubscription";
import DashboardFloat from "./DashboardFloat";
import BecomeAHostPage from "./BecomeAHostPage";

const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/bookings": "Bookings",
  "/dashboard/listings": "My Listings",
  "/dashboard/notifications": "Notifications",
  "/dashboard/subscription": "Subscription",
  "/dashboard/profile": "Profile",
  "/dashboard/float": "Float",
  "/dashboard/become-a-host": "Become a Host",
};

export default function DashboardPage() {
  const { user, tokens, accessToken, clearAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const hasHostRole = user?.roles?.includes("HOST") ?? false;
  const kycApproved = user?.kycStatus === "APPROVED";

  const [activeRole, setActiveRole] = useState<"GUEST" | "HOST">(() =>
    hasHostRole && kycApproved ? "HOST" : "GUEST",
  );

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
    (location.pathname.startsWith("/dashboard/bookings/")
      ? "Booking Detail"
      : "Dashboard");

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0">
        <DashboardSidebar
          user={user}
          activeRole={activeRole}
          onRoleChange={setActiveRole}
          onLogout={() => logout()}
          accessToken={accessToken}
        />
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
              activeRole={activeRole}
              onRoleChange={(role) => {
                setActiveRole(role);
                setSidebarOpen(false);
              }}
              onLogout={() => logout()}
              onNavClick={() => setSidebarOpen(false)}
              accessToken={accessToken}
              mobile
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-border bg-background shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 text-foreground/50 hover:text-foreground rounded-lg hover:bg-foreground/5 transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="font-display font-bold text-base md:text-lg text-foreground uppercase tracking-tight">
              {pageTitle}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/listings">
              <Button
                variant="outlineGold"
                size="sm"
                className="hidden sm:flex"
              >
                Browse Listings
              </Button>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Routes>
            <Route index element={<DashboardHome activeRole={activeRole} />} />
            <Route path="bookings" element={<DashboardBookings />} />
            <Route path="bookings/:id" element={<DashboardBookingDetail />} />
            <Route path="listings" element={<DashboardListings />} />
            <Route path="notifications" element={<DashboardNotifications />} />
            <Route path="profile" element={<DashboardProfile />} />
            <Route path="subscription" element={<DashboardSubscription />} />
            <Route path="float" element={<DashboardFloat />} />
            <Route path="become-a-host" element={<BecomeAHostPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
