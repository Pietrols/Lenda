import type { UpdateProfileInput } from "@lenda/schemas";
import { api, ApiError, AUTH_URL } from "./client";
import { useAuthStore } from "../store/auth.store";
import type { AuthUser, AuthTokens } from "../store/auth.store";

export type { UpdateProfileInput };

export type { AuthUser, AuthTokens };

export type AuthResponse = {
  user: AuthUser;
  tokens: AuthTokens;
};

export type RegisterInput = {
  email: string;
  password: string;
  roles: string[];
};

export type LoginInput = {
  email: string;
  password: string;
};

export type VerifyEmailInput = {
  email: string;
  otp: string;
};

export const authApi = {
  register: (data: RegisterInput) =>
    api.post<{ message: string }>("/auth/register", data, undefined, AUTH_URL),

  verifyEmail: (data: VerifyEmailInput) =>
    api.post<{ message: string }>(
      "/auth/verify-email",
      data,
      undefined,
      AUTH_URL,
    ),

  login: (data: LoginInput) =>
    api.post<AuthResponse>("/auth/login", data, undefined, AUTH_URL),

  me: (token: string) => api.get<AuthUser>("/auth/me", token, AUTH_URL),

  updateProfile: (input: UpdateProfileInput) => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.patch<{ user: AuthUser }>(
      "/profiles/me",
      input,
      token,
      AUTH_URL,
    );
  },

  // Multipart upload (field name "photo" per the multer route config); the
  // JSON api client cannot send FormData, so this uses fetch directly, the
  // same pattern as the KYC document upload.
  uploadProfilePhoto: async (file: {
    uri: string;
    name: string;
    mimeType: string;
  }): Promise<{ user: AuthUser }> => {
    const token = useAuthStore.getState().tokens?.accessToken;

    const formData = new FormData();
    formData.append("photo", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as unknown as Blob);

    const res = await fetch(`${AUTH_URL}/profiles/me/photo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    let data: unknown = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      const errBody = data as { message?: string } | null;
      throw new ApiError(
        errBody?.message ?? `Upload failed (${res.status})`,
        res.status,
      );
    }

    return data as { user: AuthUser };
  },

  addRole: (role: string) => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.patch<{ user: AuthUser }>(
      "/profiles/me/role",
      { role },
      token,
      AUTH_URL,
    );
  },

  refresh: (refreshToken: string) =>
    api.post<AuthResponse>(
      "/auth/refresh",
      { refreshToken },
      undefined,
      AUTH_URL,
    ),

  logout: (token: string, refreshToken: string) =>
    api.post<{ message: string }>(
      "/auth/logout",
      { refreshToken },
      token,
      AUTH_URL,
    ),

  resendOtp: (email: string) =>
    api.post<{ message: string }>(
      "/auth/resend-otp",
      { email },
      undefined,
      AUTH_URL,
    ),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>(
      "/auth/forgot-password",
      { email },
      undefined,
      AUTH_URL,
    ),

  resetPassword: (email: string, otp: string, newPassword: string) =>
    api.post<{ message: string }>(
      "/auth/reset-password",
      { email, otp, newPassword },
      undefined,
      AUTH_URL,
    ),
};
