import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasHydrated } = useAuth();

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
