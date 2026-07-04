import { router } from "expo-router";
import { authApi } from "../api/auth";
import { ApiError } from "../api/client";
import { useAuthStore } from "../store/auth.store";

export type RoleUpgradeResult =
  | { status: "success" }
  | { status: "already-host" }
  | { status: "reauth-required" }
  | { status: "error"; message: string };

// Upgrade the current user from GUEST-only to also holding the HOST role.
//
// The JWT access token has roles baked into its claims, so adding the role in
// the database alone is not enough: a token refresh is mandatory afterwards or
// HOST-only endpoints will keep rejecting the user. The refresh response's
// user object is incomplete (missing fullName, photoUrl, bio, location), so
// only its tokens are consumed; roles come from the addRole response and are
// merged into the stored user via updateUser (a partial merge, not a replace).
export async function upgradeToHost(): Promise<RoleUpgradeResult> {
  const { user, tokens, updateUser, setTokens, clearAuth } =
    useAuthStore.getState();

  if (user?.roles.includes("HOST")) {
    return { status: "already-host" };
  }

  let roles: string[];
  try {
    const res = await authApi.addRole("HOST");
    roles = res.user.roles;
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.status === 400 &&
      /already have the HOST role/i.test(err.message)
    ) {
      // The database already has the role but local state did not know it,
      // which means the current token's claims are likely stale too — fall
      // through to the refresh below with the role merged in locally.
      roles = [...new Set([...(user?.roles ?? []), "HOST"])];
    } else if (err instanceof ApiError) {
      return { status: "error", message: err.message };
    } else {
      return {
        status: "error",
        message: "Something went wrong. Please try again.",
      };
    }
  }

  try {
    const refreshToken = tokens?.refreshToken;
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }
    const refreshed = await authApi.refresh(refreshToken);
    updateUser({ roles });
    setTokens(refreshed.tokens);
    return { status: "success" };
  } catch {
    // The role WAS added in the database but the app could not obtain a token
    // carrying the new claim. Leaving the session in place would mean the app
    // keeps behaving GUEST-only against a HOST account, so force a clean
    // re-login instead.
    clearAuth();
    router.replace({
      pathname: "/login",
      params: {
        notice:
          "Your host access has been granted. Please sign in again to continue.",
      },
    });
    return { status: "reauth-required" };
  }
}
