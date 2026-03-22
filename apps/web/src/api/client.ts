import { useAuthStore } from "@/store/auth.store";

export const AUTH_URL =
  import.meta.env.VITE_API_AUTH_URL ?? "http://localhost:3001";
export const BOOKING_URL =
  import.meta.env.VITE_API_BOOKING_URL ?? "http://localhost:3002";

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
  baseURL?: string;
};

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

  // Token expired — try to refresh once
  if (res.status === 401 && retry) {
    const { tokens, setAuth, clearAuth } = useAuthStore.getState();

    if (tokens?.refreshToken) {
      const refreshRes = await fetch(`${AUTH_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const { user } = useAuthStore.getState();
        if (user) setAuth(user, refreshData.tokens);

        // Retry original request with new token
        return request<T>(
          path,
          { ...options, token: refreshData.tokens.accessToken },
          false,
        );
      } else {
        clearAuth();
        window.location.href = "/login";
        throw new Error("Session expired. Please sign in again.");
      }
    } else {
      clearAuth();
      window.location.href = "/login";
      throw new Error("Session expired. Please sign in again.");
    }
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Something went wrong");
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
