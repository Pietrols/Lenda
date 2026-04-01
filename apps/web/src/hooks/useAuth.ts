import { useAuthStore } from "@/store/auth.store";

export function useAuth() {
  const { user, tokens, isAuthenticated, _hasHydrated, setAuth, clearAuth, updateUser } =
    useAuthStore();

  return {
    user,
    tokens,
    isAuthenticated,
    hasHydrated: _hasHydrated,
    setAuth,
    clearAuth,
    updateUser,
    accessToken: tokens?.accessToken,
  };
}
