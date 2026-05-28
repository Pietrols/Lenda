import { prisma, BookingStatus } from "@lenda/database";
import { AppError } from "../middleware/errorHandler";
import { createNotification } from "./notification.service";
import { NotificationType } from "@lenda/database";

const NEGOTIATION_WINDOW_MS = 2 * 60 * 60 * 1000;
const MAX_COUNTERS_PER_PARTY = 2;

// Cast because NEGOTIATION_FAILED is added via raw SQL migration --
// Prisma generates from schema but the enum value exists in the DB.
const NEGOTIATION_FAILED = "NEGOTIATION_FAILED" as unknown as BookingStatus;

function isExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date().getTime() > new Date(expiresAt).getTime();
}

export async function submitCounter(
  bookingId: string,
  userId: string,
  amount: number,
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      guestId: true,
      hostId: true,
      isNegotiable: true,
      hostCounterCount: true,
      guestCounterCount: true,
      negotiationExpiresAt: true,
      listing: { select: { title: true } },
    },
  });

  if (!booking) throw new AppError(404, "Booking not found");
  if (!booking.isNegotiable)
    throw new AppError(400, "This booking is not negotiable");
  if (booking.status !== BookingStatus.PENDING) {
    throw new AppError(400, "Negotiation is only open on pending bookings");
  }

  const isGuest = booking.guestId === userId;
  const isHost = booking.hostId === userId;

  if (!isGuest && !isHost) {
    throw new AppError(403, "You are not a party to this booking");
  }

  if (isExpired(booking.negotiationExpiresAt)) {
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: NEGOTIATION_FAILED,
        history: {
          create: {
            fromStatus: BookingStatus.PENDING,
            toStatus: NEGOTIATION_FAILED,
            changedById: userId,
            reason: "Negotiation window expired",
          },
        },
      },
    });
    throw new AppError(
      400,
      "The negotiation window has expired. This booking has been cancelled.",
    );
  }

  if (isGuest && booking.guestCounterCount >= MAX_COUNTERS_PER_PARTY) {
    throw new AppError(
      400,
      "You have used all your counters for this negotiation.",
    );
  }
  if (isHost && booking.hostCounterCount >= MAX_COUNTERS_PER_PARTY) {
    throw new AppError(
      400,
      "You have used all your counters for this negotiation.",
    );
  }

  if (amount <= 0) throw new AppError(400, "Counter amount must be positive");

  const newExpiry = new Date(Date.now() + NEGOTIATION_WINDOW_MS);

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      currentOffer: amount,
      hostCounterCount: isHost ? { increment: 1 } : undefined,
      guestCounterCount: isGuest ? { increment: 1 } : undefined,
      negotiationExpiresAt: newExpiry,
      history: {
        create: {
          fromStatus: BookingStatus.PENDING,
          toStatus: BookingStatus.PENDING,
          changedById: userId,
          reason: `${isHost ? "Host" : "Guest"} countered with ${amount}`,
        },
      },
    },
  });

  const otherPartyId = isGuest ? booking.hostId : booking.guestId;
  const counterLabel = isHost ? "The host" : "The guest";
  await createNotification(
    otherPartyId,
    NotificationType.BOOKING_CONFIRMED,
    `${counterLabel} has countered with a new offer on "${booking.listing.title}". You have 2 hours to respond.`,
  );

  return updated;
}

export async function acceptOffer(bookingId: string, userId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      guestId: true,
      hostId: true,
      isNegotiable: true,
      currentOffer: true,
      budgetMax: true,
      negotiationExpiresAt: true,
      listing: { select: { title: true } },
    },
  });

  if (!booking) throw new AppError(404, "Booking not found");
  if (!booking.isNegotiable)
    throw new AppError(400, "This booking is not negotiable");
  if (booking.status !== BookingStatus.PENDING) {
    throw new AppError(400, "This booking is not in a negotiable state");
  }

  const isGuest = booking.guestId === userId;
  const isHost = booking.hostId === userId;

  if (!isGuest && !isHost) {
    throw new AppError(403, "You are not a party to this booking");
  }

  if (isExpired(booking.negotiationExpiresAt)) {
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: NEGOTIATION_FAILED,
        history: {
          create: {
            fromStatus: BookingStatus.PENDING,
            toStatus: NEGOTIATION_FAILED,
            changedById: userId,
            reason: "Negotiation window expired",
          },
        },
      },
    });
    throw new AppError(400, "The negotiation window has expired.");
  }

  const agreedAmount = booking.currentOffer ?? booking.budgetMax;
  if (!agreedAmount) throw new AppError(400, "No offer amount to accept");

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.CONFIRMED,
      totalAmount: agreedAmount,
      negotiationExpiresAt: null,
      history: {
        create: {
          fromStatus: BookingStatus.PENDING,
          toStatus: BookingStatus.CONFIRMED,
          changedById: userId,
          reason: `Offer of ${agreedAmount} accepted by ${isHost ? "host" : "guest"}`,
        },
      },
    },
  });

  await createNotification(
    booking.guestId,
    NotificationType.BOOKING_CONFIRMED,
    `Your booking for "${booking.listing.title}" has been confirmed at ${agreedAmount}.`,
  );
  await createNotification(
    booking.hostId,
    NotificationType.BOOKING_CONFIRMED,
    `Booking for "${booking.listing.title}" confirmed at ${agreedAmount}.`,
  );

  return updated;
}

export async function expireNegotiations() {
  const expired = await prisma.booking.findMany({
    where: {
      isNegotiable: true,
      status: BookingStatus.PENDING,
      negotiationExpiresAt: { lt: new Date() },
    },
    select: {
      id: true,
      guestId: true,
      hostId: true,
      listing: { select: { title: true } },
    },
  });

  for (const booking of expired) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: NEGOTIATION_FAILED,
        history: {
          create: {
            fromStatus: BookingStatus.PENDING,
            toStatus: NEGOTIATION_FAILED,
            changedById: booking.hostId,
            reason: "Negotiation window expired",
          },
        },
      },
    });

    await createNotification(
      booking.guestId,
      NotificationType.BOOKING_CANCELLED,
      `Your negotiation for "${booking.listing.title}" has expired with no deal reached.`,
    );
    await createNotification(
      booking.hostId,
      NotificationType.BOOKING_CANCELLED,
      `A negotiation for "${booking.listing.title}" has expired with no deal reached.`,
    );
  }

  return expired.length;
}
