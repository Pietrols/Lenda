import type { CreateListingInput, UpdateListingInput } from "@lenda/schemas";
import { api, ApiError, BOOKING_URL } from "./client";
import { useAuthStore } from "../store/auth.store";

export type { CreateListingInput, UpdateListingInput };

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
  deliveryFee: string | null;
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
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  // ISO datetimes; when both are set the server excludes listings that have
  // a conflicting booking in that range.
  startDate?: string;
  endDate?: string;
  page?: number;
};

export const listingsApi = {
  getAll: (params: GetListingsParams = {}) => {
    const query = new URLSearchParams();
    if (params.pillar) query.set("pillar", params.pillar);
    if (params.category) query.set("category", params.category);
    if (params.search) query.set("search", params.search);
    if (params.location) query.set("location", params.location);
    if (params.minPrice !== undefined)
      query.set("minPrice", String(params.minPrice));
    if (params.maxPrice !== undefined)
      query.set("maxPrice", String(params.maxPrice));
    if (params.startDate) query.set("startDate", params.startDate);
    if (params.endDate) query.set("endDate", params.endDate);
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

  // PATCH returns the bare updated record (scalars only, like create).
  update: (id: string, input: UpdateListingInput) => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.patch<CreateListingResponse>(
      `/listings/${id}`,
      input,
      token,
      BOOKING_URL,
    );
  },

  // Soft delete (archived server-side); rejected with 400 if the listing has
  // active bookings.
  remove: (id: string) => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.delete<{ message: string }>(
      `/listings/${id}`,
      token,
      BOOKING_URL,
    );
  },

  // Multipart upload (field name "image" per the multer route config); the
  // JSON api client cannot send FormData, so this uses fetch directly.
  uploadImage: async (
    listingId: string,
    file: { uri: string; name: string; mimeType: string },
    isPrimary = false,
  ): Promise<{ image: ListingImage }> => {
    const token = useAuthStore.getState().tokens?.accessToken;

    const formData = new FormData();
    formData.append("image", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as unknown as Blob);
    if (isPrimary) formData.append("isPrimary", "true");

    const res = await fetch(`${BOOKING_URL}/listings/${listingId}/images`, {
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

    return data as { image: ListingImage };
  },

  deleteImage: (listingId: string, imageId: string) => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.delete<{ message: string }>(
      `/listings/${listingId}/images/${imageId}`,
      token,
      BOOKING_URL,
    );
  },
};
