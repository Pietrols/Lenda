import { api, AUTH_URL, BOOKING_URL } from "./client";
import { useAuthStore } from "../store/auth.store";

function accessToken() {
  return useAuthStore.getState().tokens?.accessToken;
}

// GET /admin/users on auth-service. Supports page/limit only; there is no
// server-side search, so screens filter client-side.
export type AdminUser = {
  id: string;
  email: string;
  fullName: string | null;
  photoUrl: string | null;
  bio: string | null;
  location: string | null;
  roles: string[];
  kycStatus: string;
  isActive: boolean;
  subscriptionPlan: string;
  listingTier: number;
  createdAt: string;
  badges: string[];
  _count: { kycDocuments: number };
};

export type AdminUsersResponse = {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
};

export type AdminUserDetail = Omit<AdminUser, "_count"> & {
  commissionRate: string | null;
};

export type AdminKycDocument = {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  downloadUrl?: string | null;
};

export type AdminSuspendResult = {
  id: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  suspendedUntil: string | null;
};

// GET /admin/listings on booking-service (summary rows with host attached).
export type AdminListing = {
  id: string;
  title: string;
  pillar: "RENTAL" | "SERVICE";
  category: string;
  status: string;
  createdAt: string;
  host: { id: string; fullName: string | null; email: string };
};

export const adminApi = {
  getUsers: (page = 1, limit = 50) =>
    api.get<AdminUsersResponse>(
      `/admin/users?page=${page}&limit=${limit}`,
      accessToken(),
      AUTH_URL,
    ),

  getUser: (id: string) =>
    api.get<{ user: AdminUserDetail }>(
      `/admin/users/${id}`,
      accessToken(),
      AUTH_URL,
    ),

  getUserKycDocuments: (id: string) =>
    api.get<{ documents: AdminKycDocument[] }>(
      `/admin/users/${id}/kyc-documents`,
      accessToken(),
      AUTH_URL,
    ),

  setKycStatus: (id: string, status: "APPROVED" | "REJECTED", reason?: string) =>
    api.patch<{ user: AdminUserDetail }>(
      `/admin/users/${id}/kyc`,
      { status, reason },
      accessToken(),
      AUTH_URL,
    ),

  // durationDays omitted = permanent suspension; the server computes
  // suspendedUntil and login is blocked until it passes.
  suspendUser: (id: string, suspend: boolean, durationDays?: number) =>
    api.patch<{ user: AdminSuspendResult }>(
      `/admin/users/${id}/suspend`,
      { suspend, durationDays },
      accessToken(),
      AUTH_URL,
    ),

  getListings: () =>
    api.get<{ listings: AdminListing[]; total: number }>(
      "/admin/listings",
      accessToken(),
      BOOKING_URL,
    ),

  verifyListing: (id: string) =>
    api.patch<{ listing: AdminListing }>(
      `/admin/listings/${id}/verify`,
      {},
      accessToken(),
      BOOKING_URL,
    ),

  suspendListing: (id: string) =>
    api.patch<{ listing: AdminListing }>(
      `/admin/listings/${id}/suspend`,
      {},
      accessToken(),
      BOOKING_URL,
    ),
};
