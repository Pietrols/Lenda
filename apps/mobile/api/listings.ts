import { api, BOOKING_URL } from "./client";

export type ListingPillar = "RENTAL" | "SERVICE";

export type ListingImage = {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  order: number;
};

export type ListingHost = {
  id: string;
  fullName: string | null;
  photoUrl: string | null;
  kycStatus: string;
};

export type Listing = {
  id: string;
  hostId: string;
  pillar: ListingPillar;
  category: string;
  subcategory: string | null;
  title: string;
  description: string;
  pricePerDay: string;
  currency: string;
  pricingMode: string;
  location: string;
  status: string;
  metadata: Record<string, unknown>;
  discoveryScore: number;
  responseRate: number;
  createdAt: string;
  updatedAt: string;
  images: ListingImage[];
  host: ListingHost;
};

export type ListingsPagination = {
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export type ListingsResponse = {
  listings: Listing[];
  pagination: ListingsPagination;
};

export type GetListingsParams = {
  pillar?: ListingPillar;
  category?: string;
  search?: string;
  page?: number;
};

export const listingsApi = {
  getAll: (params: GetListingsParams = {}) => {
    const query = new URLSearchParams();
    if (params.pillar) query.set("pillar", params.pillar);
    if (params.category) query.set("category", params.category);
    if (params.search) query.set("search", params.search);
    if (params.page) query.set("page", String(params.page));

    const qs = query.toString();
    return api.get<ListingsResponse>(
      `/listings${qs ? `?${qs}` : ""}`,
      undefined,
      BOOKING_URL,
    );
  },
};
