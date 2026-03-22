import { useAuthStore } from "@/store/auth.store";

export function useAuth() {
  const { user, tokens, isAuthenticated, setAuth, clearAuth, updateUser } =
    useAuthStore();

  return {
    user,
    tokens,
    isAuthenticated,
    setAuth,
    clearAuth,
    updateUser,
    accessToken: tokens?.accessToken,
  };
}
