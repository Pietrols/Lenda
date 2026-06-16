// Auth types mirrored from the web client (apps/web/src/api/auth.ts).

export type AuthUser = {
  id: string;
  email: string;
  fullName?: string | null;
  roles: string[];
  kycStatus?: string;
  photoUrl?: string | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = {
  user: AuthUser;
  tokens: AuthTokens;
};
