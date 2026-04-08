import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, _hasHydrated } = useAuthStore();
  if (!_hasHydrated) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
