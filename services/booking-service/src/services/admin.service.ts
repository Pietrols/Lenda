import {
  prisma,
  ListingStatus,
  NotificationType,
  Prisma,
} from "@lenda/database";
import { AppError } from "../middleware/errorHandler";
import { recalculateDiscoveryScore } from "./discovery.service";
import { createNotification } from "./notification.service";

export async function verifyListing(
  listingId: string,
  adminId: string,
): Promise<Prisma.ListingGetPayload<object>> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId, deletedAt: null },
    select: { id: true, hostId: true, status: true, title: true },
  });

  if (!listing) throw new AppError(404, "Listing not found");
  if (listing.status !== ListingStatus.PENDING_VERIFICATION) {
    throw new AppError(400, "Listing is not pending verification");
  }

  const updated = await prisma.listing.update({
    where: { id: listingId },
    data: { status: ListingStatus.ACTIVE },
  });

  await createNotification(
    listing.hostId,
    NotificationType.KYC_APPROVED,
    `Your listing "${listing.title}" has been verified and is now live`,
  );

  await recalculateDiscoveryScore(listingId);

  return updated;
}

export async function suspendListing(
  listingId: string,
  adminId: string,
): Promise<Prisma.ListingGetPayload<object>> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId, deletedAt: null },
    select: { id: true, hostId: true, status: true, title: true },
  });

  if (!listing) throw new AppError(404, "Listing not found");
  if (listing.status === ListingStatus.SUSPENDED) {
    throw new AppError(400, "Listing is already suspended");
  }

  const updated = await prisma.listing.update({
    where: { id: listingId },
    data: { status: ListingStatus.SUSPENDED },
  });

  await createNotification(
    listing.hostId,
    NotificationType.LISTING_SUSPENDED,
    `Your listing "${listing.title}" has been suspended. Please contact support.`,
  );

  return updated;
}

export async function removeReview(
  reviewId: string,
  adminId: string,
  note?: string,
) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      isVisible: true,
      reviewerId: true,
      booking: { select: { listingId: true } },
    },
  });

  if (!review) throw new AppError(404, "Review not found");
  if (!review.isVisible) throw new AppError(400, "Review is already removed");

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      isVisible: false,
      removedById: adminId,
      removedAt: new Date(),
      removedNote: note ?? null,
    },
  });

  await createNotification(
    review.reviewerId,
    NotificationType.REVIEW_REMOVED,
    "One of your reviews has been removed by an admin",
  );

  await recalculateDiscoveryScore(review.booking.listingId);

  return updated;
}

export async function boostUserDiscovery(
  userId: string,
  adminId: string,
  amount: number = 10,
) {
  const listings = await prisma.listing.findMany({
    where: {
      hostId: userId,
      deletedAt: null,
      status: { in: [ListingStatus.ACTIVE, ListingStatus.DRAFT] },
    },
    select: { id: true },
  });

  if (!listings.length)
    throw new AppError(404, "No active listings found for this user");

  await prisma.listing.updateMany({
    where: { id: { in: listings.map((l) => l.id) } },
    data: { discoveryScore: { increment: amount } },
  });

  await createNotification(
    userId,
    NotificationType.KYC_APPROVED,
    "Your listings have received a visibility boost from the Lenda team.",
  );

  return { boosted: listings.length, amount };
}
