import { prisma, ListingStatus, Prisma } from "@lenda/database";
import { CreateListingInput } from "@lenda/schemas";
import { AppError } from "../middleware/errorHandler";

const TIER_LIMITS: Record<number, number> = {
  0: 0,
  1: 2,
  2: 5,
  3: Infinity,
};

export async function createListing(hostId: string, data: CreateListingInput: Promise<{ id: string; title: string; status: ListingStatus }> {
  const host = await prisma.user.findUnique({
    where: { id: hostId },
    select: { listingTier: true, kycStatus: true },
  });

  if (!host) throw new AppError(404, "User not found");
  if (host.kycStatus !== "APPROVED") {
    throw new AppError(403, "Your account must be verified before listing");
  }

  const limit = TIER_LIMITS[host.listingTier] ?? 0;

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
      currency: data.currency,
      location: data.location,
      metadata: data.metadata as Prisma.InputJsonValue,
    },
  });

  return listing;
}
