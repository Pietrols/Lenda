import { api, AUTH_URL } from "./client";

export type AuthUser = {
  id: string;
  email: string;
  phone: string | null;
  roles: string[];
  emailVerified: boolean;
  phoneVerified: boolean;
  kycStatus: string;
  isActive: boolean;
  fullName: string | null;
  photoUrl: string | null;
  bio: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

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
};
