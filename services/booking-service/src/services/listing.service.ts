import { prisma, ListingStatus, BookingStatus, Prisma } from "@lenda/database";
import type {
  CreateListingInput,
  GetListingsQueryInput,
  UpdateListingInput,
} from "@lenda/schemas";
import { AppError } from "../middleware/errorHandler";
import { buildNextCursor, type PaginationParams } from "../lib/pagination";

const TIER_LIMITS: Record<number, number> = {
  0: 0,
  1: 2,
  2: 5,
  3: Infinity,
};

const PRO_EXTRA_SLOTS = 3;

export async function createListing(hostId: string, data: CreateListingInput) {
  const host = await prisma.user.findUnique({
    where: { id: hostId },
    select: { listingTier: true, kycStatus: true, subscriptionPlan: true },
  });

  if (!host) throw new AppError(404, "User not found");
  if (host.kycStatus !== "APPROVED") {
    throw new AppError(403, "Your account must be verified before listing");
  }

  const baseLimit = TIER_LIMITS[host.listingTier] ?? 0;
  const isPro = host.subscriptionPlan !== "FREE";
  const limit = isPro ? baseLimit + PRO_EXTRA_SLOTS : baseLimit;

  const activeCount = await prisma.listing.count({
    where: {
      hostId,
      status: {
        in: [
          ListingStatus.DRAFT,
          ListingStatus.PENDING_VERIFICATION,
          ListingStatus.ACTIVE,
        ],
      },
      deletedAt: null,
    },
  });

  if (activeCount >= limit) {
    throw new AppError(
      403,
      `You have reached your listing limit of ${limit} for your current tier`,
    );
  }

  const listing = await prisma.listing.create({
    data: {
      hostId,
      title: data.title,
      description: data.description,
      pillar: data.pillar,
      category: data.category,
      subcategory: data.subcategory,
      pricePerDay: data.pricePerDay,
      deliveryFee: data.deliveryFee,
      currency: data.currency,
      pricingMode: (data.pricingMode ?? "FIXED") as any,
      location: data.location,
      metadata: data.metadata as Prisma.InputJsonValue,
      status: ListingStatus.ACTIVE,
    },
  });

  return listing;
}

const LISTING_LIST_INCLUDE = {
  images: { where: { isPrimary: true } },
  host: {
    select: {
      id: true,
      fullName: true,
      photoUrl: true,
      kycStatus: true,
    },
  },
} satisfies Prisma.ListingInclude;

async function buildListingWhere(
  query: GetListingsQueryInput,
): Promise<Prisma.ListingWhereInput> {
  const { pillar, category, location, search, minPrice, maxPrice, startDate, endDate } =
    query;

  let excludedListingIds: string[] = [];
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        status: {
          notIn: [
            BookingStatus.CANCELLED,
            BookingStatus.COMPLETED,
            BookingStatus.DISPUTED,
          ],
        },
        AND: [{ startDate: { lt: end } }, { endDate: { gt: start } }],
      },
      select: { listingId: true },
    });
    excludedListingIds = conflictingBookings.map((b) => b.listingId);
  }

  return {
    status: ListingStatus.ACTIVE,
    deletedAt: null,
    ...(pillar && { pillar }),
    ...(category && { category }),
    ...(location && {
      location: { contains: location, mode: "insensitive" as const },
    }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
        { category: { contains: search, mode: "insensitive" as const } },
        { location: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? {
          pricePerDay: {
            ...(minPrice !== undefined && { gte: minPrice }),
            ...(maxPrice !== undefined && { lte: maxPrice }),
          },
        }
      : {}),
    ...(excludedListingIds.length > 0 && {
      id: { notIn: excludedListingIds },
    }),
  };
}

// Offset/page pagination — preserves the existing { listings, pagination }
// response the web app depends on.
export async function getListings(query: GetListingsQueryInput) {
  const { page, limit } = query;
  const skip = (page - 1) * limit;
  const where = await buildListingWhere(query);

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: LISTING_LIST_INCLUDE,
      orderBy: { discoveryScore: "desc" },
      skip,
      take: limit,
    }),
    prisma.listing.count({ where }),
  ]);

  return {
    listings,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
}

// Cursor pagination — used when the caller passes ?cursor=. Returns
// { listings, nextCursor }. id is the cursor field and a deterministic
// tiebreak on top of discoveryScore so paging is stable.
export async function getListingsCursor(
  query: GetListingsQueryInput,
  pagination: PaginationParams,
) {
  const { cursor, limit } = pagination;
  const where = await buildListingWhere(query);

  const items = await prisma.listing.findMany({
    where,
    include: LISTING_LIST_INCLUDE,
    orderBy: [{ discoveryScore: "desc" }, { id: "desc" }],
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  return { listings: items, nextCursor: buildNextCursor(items, limit) };
}

export async function getListingsByHost(hostId: string) {
  const listings = await prisma.listing.findMany({
    where: {
      hostId,
      status: ListingStatus.ACTIVE,
      deletedAt: null,
    },
    include: {
      images: { where: { isPrimary: true } },
    },
    orderBy: { discoveryScore: "desc" },
  });
  return listings;
}

export async function getListingById(id: string) {
  const listing = await prisma.listing.findUnique({
    where: { id, deletedAt: null },
    include: {
      images: { orderBy: { order: "asc" } },
      host: {
        select: {
          id: true,
          fullName: true,
          photoUrl: true,
          location: true,
          kycStatus: true,
          createdAt: true,
        },
      },
    },
  });

  if (!listing) throw new AppError(404, "Listing not found");
  return listing;
}

export async function getMyListings(hostId: string) {
  const listings = await prisma.listing.findMany({
    where: {
      hostId,
      deletedAt: null,
      status: { notIn: [ListingStatus.ARCHIVED] },
    },
    include: { images: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return listings;
}

export async function updateListing(
  listingId: string,
  hostId: string,
  data: UpdateListingInput,
) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId, deletedAt: null },
    select: { hostId: true, status: true },
  });

  if (!listing) throw new AppError(404, "Listing not found");
  if (listing.hostId !== hostId) {
    throw new AppError(403, "You do not own this listing");
  }
  if (listing.status === ListingStatus.SUSPENDED) {
    throw new AppError(403, "Suspended listings cannot be edited");
  }

  const { metadata, ...rest } = data;

  const updated = await prisma.listing.update({
    where: { id: listingId },
    data: {
      ...rest,
      ...(metadata && { metadata: metadata as Prisma.InputJsonValue }),
    },
  });

  return updated;
}

export async function deleteListing(listingId: string, hostId: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId, deletedAt: null },
    select: { hostId: true },
  });

  if (!listing) throw new AppError(404, "Listing not found");
  if (listing.hostId !== hostId) {
    throw new AppError(403, "You do not own this listing");
  }

  const activeBooking = await prisma.booking.findFirst({
    where: {
      listingId,
      status: {
        notIn: [
          BookingStatus.CANCELLED,
          BookingStatus.COMPLETED,
          BookingStatus.DISPUTED,
        ],
      },
    },
  });

  if (activeBooking) {
    throw new AppError(400, "Cannot delete a listing with active bookings");
  }

  await prisma.listing.update({
    where: { id: listingId },
    data: { deletedAt: new Date(), status: ListingStatus.ARCHIVED },
  });
}
