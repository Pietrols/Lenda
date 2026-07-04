import type { CreateListingInput } from "@lenda/schemas";
import { api, BOOKING_URL } from "./client";
import { useAuthStore } from "../store/auth.store";

export type { CreateListingInput };

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

export type ListingDetailHost = ListingHost & {
  location: string | null;
  createdAt: string;
};

export type ListingDetail = Omit<Listing, "host"> & {
  deletedAt: string | null;
  host: ListingDetailHost;
};

export type ListingDetailResponse = {
  listing: ListingDetail;
};

// GET /listings/mine returns the host's own listings across all non-archived
// statuses (DRAFT, PENDING_VERIFICATION, ACTIVE, SUSPENDED). Unlike the public
// list and detail responses, the server does not include a host object here.
export type MyListing = Omit<Listing, "host"> & {
  deletedAt: string | null;
};

export type MyListingsResponse = {
  listings: MyListing[];
};

// POST /listings returns the freshly created record with scalar fields only —
// no images or host relations are included in the create response. The server
// creates it with status ACTIVE (immediately public), not DRAFT.
export type CreatedListing = Omit<MyListing, "images">;

export type CreateListingResponse = {
  listing: CreatedListing;
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

  getById: (id: string) =>
    api.get<ListingDetailResponse>(`/listings/${id}`, undefined, BOOKING_URL),

  getMine: () => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.get<MyListingsResponse>("/listings/mine", token, BOOKING_URL);
  },

  create: (input: CreateListingInput) => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.post<CreateListingResponse>(
      "/listings",
      input,
      token,
      BOOKING_URL,
    );
  },
};
