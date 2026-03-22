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
): Promise<T> {
  const { method = "GET", body, token, baseURL = AUTH_URL } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${baseURL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

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
