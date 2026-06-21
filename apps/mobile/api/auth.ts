import { api, AUTH_URL } from "./client";
import type { AuthUser, AuthTokens } from "../store/auth.store";

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

  addRole: (role: string, token: string) =>
    api.patch<{ user: AuthUser }>(
      "/profiles/me/role",
      { role },
      token,
      AUTH_URL,
    ),

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
