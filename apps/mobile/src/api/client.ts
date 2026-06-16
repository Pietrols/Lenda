import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import type { AuthTokens } from "@/api/auth";

// Base URLs come from EXPO_PUBLIC_* env at build time (Expo inlines these),
// falling back to localhost for the simulator. On a physical device set
// EXPO_PUBLIC_API_AUTH_URL / EXPO_PUBLIC_API_BOOKING_URL to a reachable host.
export const AUTH_URL =
  process.env.EXPO_PUBLIC_API_AUTH_URL ?? "http://localhost:3001";
export const BOOKING_URL =
  process.env.EXPO_PUBLIC_API_BOOKING_URL ?? "http://localhost:3002";

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
  baseURL?: string;
};

export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  status: number;
  errors?: FieldErrors;

  constructor(message: string, status: number, errors?: FieldErrors) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

// Single-flight refresh: when several requests get a 401 at once, they all
// await the same in-flight /auth/refresh call instead of each firing their own
// (which would race and invalidate each other's rotating refresh token).
// Resolves to the new tokens on success, or null if refresh isn't possible.
let refreshPromise: Promise<AuthTokens | null> | null = null;

function refreshAccessToken(): Promise<AuthTokens | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const { tokens, user, setAuth } = useAuthStore.getState();
      if (!tokens?.refreshToken) return null;

      const refreshRes = await fetch(`${AUTH_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (!refreshRes.ok) return null;

      const refreshData = await refreshRes.json();
      if (user) setAuth(user, refreshData.tokens);
      return refreshData.tokens as AuthTokens;
    })().finally(() => {
      // Clear the slot so the next 401 after this settles starts a fresh call.
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
  retry = true,
): Promise<T> {
  const { method = "GET", body, token, baseURL = AUTH_URL } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${baseURL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Token expired - try to refresh once. Concurrent 401s share a single
  // refresh via refreshAccessToken().
  if (res.status === 401 && retry && token) {
    const newTokens = await refreshAccessToken();

    if (newTokens?.accessToken) {
      // Retry original request with the new token (retry=false: only once).
      return request<T>(
        path,
        { ...options, token: newTokens.accessToken },
        false,
      );
    }

    useAuthStore.getState().clearAuth();
    // React Native has no window.location — navigate via the router instead.
    router.replace("/login");
    throw new Error("Session expired. Please sign in again.");
  }

  let data: unknown = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON body */
  }

  if (!res.ok) {
    const errBody = data as {
      message?: string;
      errors?: FieldErrors;
    } | null;
    const message = errBody?.message ?? `Request failed (${res.status})`;
    throw new ApiError(message, res.status, errBody?.errors);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, token?: string, baseURL?: string) =>
    request<T>(path, { method: "GET", token, baseURL }),
  post: <T>(path: string, body: unknown, token?: string, baseURL?: string) =>
    request<T>(path, { method: "POST", body, token, baseURL }),
  patch: <T>(path: string, body: unknown, token?: string, baseURL?: string) =>
    request<T>(path, { method: "PATCH", body, token, baseURL }),
  delete: <T>(path: string, token?: string, baseURL?: string) =>
    request<T>(path, { method: "DELETE", token, baseURL }),
};
