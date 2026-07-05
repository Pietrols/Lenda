import { authApi } from "../api/auth";
import { useAuthStore } from "../store/auth.store";

// Refetch the current user from /auth/me and merge into the store. Server-side
// changes (admin KYC approval, role edits) otherwise stay invisible until the
// next login because the persisted user never refreshes itself. Best-effort:
// failures are ignored, the stored user simply stays as-is.
export async function refreshUserProfile(): Promise<void> {
  const { tokens, isAuthenticated, updateUser } = useAuthStore.getState();
  if (!isAuthenticated || !tokens?.accessToken) return;

  try {
    const me = await authApi.me(tokens.accessToken);
    updateUser(me);
  } catch {
    // Stale-but-usable beats an error here; auth failures are handled by the
    // API client's refresh/session-expiry path already.
  }
}
