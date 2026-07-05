// Single-flight refresh: when several requests get a 401 at once, they all
// await the same in-flight /auth/refresh call instead of each firing their
// own (which would race and invalidate each other's rotating refresh token).
// Resolves to the new tokens on success, or null if refresh isn't possible.

export const AUTH_URL =
  process.env.EXPO_PUBLIC_AUTH_URL ?? "http://localhost:3001";
export const BOOKING_URL =
  process.env.EXPO_PUBLIC_BOOKING_URL ?? "http://localhost:3002";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

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

// Thrown when refresh fails and the session cannot continue.
// The navigation layer (auth store / _layout) listens for this to redirect.
export class SessionExpiredError extends Error {
  constructor() {
    super("Session expired. Please sign in again.");
    this.name = "SessionExpiredError";
  }
}

// Injected by the auth store in Step 4. Kept decoupled here so this client
// has no dependency on zustand or SecureStore, and no circular import risk.
type AuthHooks = {
  getRefreshToken: () => string | null;
  onRefreshSuccess: (tokens: AuthTokens) => void;
  onSessionExpired: () => void;
};

let authHooks: AuthHooks = {
  getRefreshToken: () => null,
  onRefreshSuccess: () => {},
  onSessionExpired: () => {},
};

export function configureApiAuth(hooks: AuthHooks) {
  authHooks = hooks;
}

let refreshPromise: Promise<AuthTokens | null> | null = null;

function refreshAccessToken(): Promise<AuthTokens | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = authHooks.getRefreshToken();
      if (!refreshToken) return null;

      const refreshRes = await fetch(`${AUTH_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!refreshRes.ok) return null;

      const refreshData = await refreshRes.json();
      const newTokens = refreshData.tokens as AuthTokens;
      authHooks.onRefreshSuccess(newTokens);
      return newTokens;
    })().finally(() => {
      // Clear the slot so the next 401 after this settles starts a fresh call.
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// Abort requests that hang (unreachable LAN dev server, dead network) instead
// of letting fetch wait indefinitely.
const REQUEST_TIMEOUT_MS = 15000;

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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${baseURL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    throw new ApiError(
      aborted
        ? "The request timed out. Please check your connection and try again."
        : "Could not reach the server. Please check your connection and try again.",
      0,
    );
  } finally {
    clearTimeout(timeout);
  }

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

    authHooks.onSessionExpired();
    throw new SessionExpiredError();
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
