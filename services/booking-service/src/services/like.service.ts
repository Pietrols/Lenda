import { prisma, LikeTargetType } from "@lenda/database";
import type { CreateLikeInput } from "@lenda/schemas";
import { AppError } from "../middleware/errorHandler";
import { recalculateDiscoveryScore } from "./discovery.service";

export async function toggleLike(userId: string, data: CreateLikeInput) {
  const { targetId, targetType } = data;

  await validateTarget(targetId, targetType as LikeTargetType);

  const existing = await prisma.like.findUnique({
    where: {
      userId_targetId_targetType: {
        userId,
        targetId,
        targetType: targetType as LikeTargetType,
      },
    },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    if (targetType === "LISTING") {
      await recalculateDiscoveryScore(targetId);
    }
    return { liked: false };
  }

  const likeData: any = {
    userId,
    targetId,
    targetType: targetType as LikeTargetType,
    ...(targetType === "LISTING" && { listingId: targetId }),
    ...(targetType === "REVIEW" && { reviewId: targetId }),
  };

  await prisma.like.create({ data: likeData });

  if (targetType === "LISTING") {
    await recalculateDiscoveryScore(targetId);
  }

  return { liked: true };
}

async function validateTarget(targetId: string, targetType: LikeTargetType) {
  if (targetType === LikeTargetType.LISTING) {
    const listing = await prisma.listing.findUnique({
      where: { id: targetId, deletedAt: null },
    });
    if (!listing) throw new AppError(404, "Listing not found");
  }

  if (targetType === LikeTargetType.REVIEW) {
    const review = await prisma.review.findUnique({
      where: { id: targetId, isVisible: true },
    });
    if (!review) throw new AppError(404, "Review not found");
  }

  if (targetType === LikeTargetType.USER) {
    const user = await prisma.user.findUnique({
      where: { id: targetId, deletedAt: null },
    });
    if (!user) throw new AppError(404, "User not found");
  }
}

export async function getLikeCount(targetId: string, targetType: string) {
  const count = await prisma.like.count({
    where: { targetId, targetType: targetType as LikeTargetType },
  });
  return { targetId, targetType, count };
}

// The user's own liked listings, newest first, for the Saved screen and for
// initialising heart state on listing detail. Soft-deleted listings are
// excluded rather than surfacing dead rows.
export async function getMyLikedListings(userId: string) {
  const likes = await prisma.like.findMany({
    where: { userId, targetType: LikeTargetType.LISTING },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        include: { images: { where: { isPrimary: true } } },
      },
    },
  });

  return likes.filter((like) => like.listing && !like.listing.deletedAt);
}
