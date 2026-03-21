import { prisma, SubscriptionPlan, KycStatus } from "@lenda/database";

const WEIGHTS = {
  subscriptionTier: 0.3,
  verificationBonus: 0.1,
  averageRating: 0.25,
  totalLikes: 0.15,
  completedBookings: 0.1,
  recency: 0.05,
  responseRate: 0.05,
};

const SUBSCRIPTION_SCORE: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.FREE]: 0.3,
  [SubscriptionPlan.PRO_MONTHLY]: 1.0,
  [SubscriptionPlan.PRO_ANNUAL]: 1.0,
};

const NEW_HOST_BOOKING_THRESHOLD = 3;
const NEW_HOST_DAY_THRESHOLD = 30;

export async function recalculateDiscoveryScore(listingId: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      hostId: true,
      createdAt: true,
      host: {
        select: {
          kycStatus: true,
          subscriptionPlan: true,
        },
      },
    },
  });

  if (!listing) return;

  // 1. Subscription tier score
  const subScore = SUBSCRIPTION_SCORE[listing.host.subscriptionPlan] ?? 0.3;

  // 2. Verification bonus — extra weight for verified free users
  const isVerified = listing.host.kycStatus === KycStatus.APPROVED;
  const isPro = listing.host.subscriptionPlan !== SubscriptionPlan.FREE;
  const verificationBonus = isVerified && !isPro ? 0.5 : isVerified ? 1.0 : 0;

  // 3. Average rating from visible guest-to-host reviews
  const ratingData = await prisma.review.aggregate({
    where: {
      booking: { listingId },
      type: "GUEST_TO_HOST",
      isVisible: true,
    },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const avgRating = ratingData._avg.rating ?? 0;
  const ratingScore = avgRating / 5;

  // 4. Total likes on listing
  const likeCount = await prisma.like.count({
    where: { listingId },
  });
  const likeScore = Math.min(likeCount / 50, 1);

  // 5. Completed bookings
  const completedCount = await prisma.booking.count({
    where: { listingId, status: "COMPLETED" },
  });
  const bookingScore = Math.min(completedCount / 20, 1);

  // 6. Recency / new host boost
  const daysSinceCreation = Math.floor(
    (Date.now() - listing.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  const isNewHost =
    daysSinceCreation <= NEW_HOST_DAY_THRESHOLD &&
    completedCount < NEW_HOST_BOOKING_THRESHOLD;
  const recencyScore = isNewHost
    ? 1.0
    : Math.max(0, 1 - daysSinceCreation / 365);

  // 7. Response rate (already stored on listing)
  const listingFull = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { responseRate: true },
  });
  const responseScore = listingFull?.responseRate ?? 0;

  // Final weighted score
  const score =
    WEIGHTS.subscriptionTier * subScore +
    WEIGHTS.verificationBonus * verificationBonus +
    WEIGHTS.averageRating * ratingScore +
    WEIGHTS.totalLikes * likeScore +
    WEIGHTS.completedBookings * bookingScore +
    WEIGHTS.recency * recencyScore +
    WEIGHTS.responseRate * responseScore;

  // Date-seeded rotation offset — shifts daily so same listing
  // doesn't always appear first within its score tier
  const today = new Date();
  const dateSeed =
    (today.getFullYear() * 10000 +
      (today.getMonth() + 1) * 100 +
      today.getDate()) %
    100;
  const rotationOffset = (dateSeed / 100) * 0.05;

  const finalScore = Math.min(score + rotationOffset, 1);

  await prisma.listing.update({
    where: { id: listingId },
    data: { discoveryScore: finalScore },
  });

  return finalScore;
}

export async function recalculateAllScores() {
  const listings = await prisma.listing.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });

  await Promise.all(listings.map((l) => recalculateDiscoveryScore(l.id)));
}
