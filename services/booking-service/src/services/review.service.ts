import { prisma, BookingStatus, ReviewType } from "@lenda/database";
import type { CreateReviewInput } from "@lenda/schemas";
import { AppError } from "../middleware/errorHandler";
import { recalculateDiscoveryScore } from "./discovery.service";

export async function createReview(
  reviewerId: string,
  data: CreateReviewInput,
) {
  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    select: {
      id: true,
      guestId: true,
      hostId: true,
      status: true,
      listingId: true,
      listing: { select: { pillar: true } },
    },
  });

  if (!booking) throw new AppError(404, "Booking not found");

  const isRental = booking.listing.pillar === "RENTAL";

  const reviewableStatuses: BookingStatus[] = isRental
    ? [
        BookingStatus.HANDED_OVER,
        BookingStatus.ACTIVE,
        BookingStatus.RETURN_PENDING,
        BookingStatus.RETURNED,
        BookingStatus.COMPLETED,
      ]
    : [BookingStatus.ACTIVE, BookingStatus.COMPLETED];

  if (!reviewableStatuses.includes(booking.status)) {
    throw new AppError(
      400,
      isRental
        ? "Reviews can only be submitted after handover has occurred"
        : "Reviews can only be submitted once the service is active or completed",
    );
  }

  const isGuest = booking.guestId === reviewerId;
  const isHost = booking.hostId === reviewerId;

  if (!isGuest && !isHost) {
    throw new AppError(403, "You are not a party to this booking");
  }

  const type = isGuest ? ReviewType.GUEST_TO_HOST : ReviewType.HOST_TO_GUEST;
  const revieweeId = isGuest ? booking.hostId : booking.guestId;

  const existing = await prisma.review.findFirst({
    where: { bookingId: data.bookingId, reviewerId, type },
  });

  if (existing) {
    throw new AppError(400, "You have already reviewed this booking");
  }

  const review = await prisma.review.create({
    data: {
      bookingId: data.bookingId,
      reviewerId,
      revieweeId,
      type,
      rating: data.rating,
      comment: data.comment,
    },
  });

  await recalculateDiscoveryScore(booking.listingId);

  return review;
}

export async function getReviewsForListing(listingId: string) {
  const bookingIds = await prisma.booking.findMany({
    where: { listingId },
    select: { id: true },
  });

  const reviews = await prisma.review.findMany({
    where: {
      bookingId: { in: bookingIds.map((b) => b.id) },
      type: ReviewType.GUEST_TO_HOST,
      isVisible: true,
    },
    include: {
      reviewer: {
        select: {
          id: true,
          fullName: true,
          photoUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return reviews;
}

export async function getReviewsForUser(userId: string) {
  const reviews = await prisma.review.findMany({
    where: { revieweeId: userId, isVisible: true },
    include: {
      reviewer: {
        select: {
          id: true,
          fullName: true,
          photoUrl: true,
        },
      },
      booking: {
        select: {
          id: true,
          listing: {
            select: { id: true, title: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return reviews;
}
