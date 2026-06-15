import {
  prisma,
  BookingStatus,
  ListingStatus,
  Prisma,
  HandoverType,
} from "@lenda/database";
import type { CreateBookingInput } from "@lenda/schemas";
import { AppError } from "../middleware/errorHandler";
import { recalculateDiscoveryScore } from "./discovery.service";
import { createNotification } from "./notification.service";
import { NotificationType } from "@lenda/database";
import {
  buildNextCursor,
  type PaginationParams,
} from "../lib/pagination";

type Role = "GUEST" | "HOST" | "ADMIN";

const NEGOTIATION_FAILED_STATUS = "NEGOTIATION_FAILED" as unknown as BookingStatus;

// The no_overlapping_bookings GiST exclusion constraint surfaces as Postgres
// error 23P01. Depending on the driver path Prisma reports it as a known
// request error with code P2010 (raw/engine failure) and/or carries the raw
// 23P01 in meta or the message — so we check all of them.
function isExclusionViolation(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2010") return true;
    const pgCode = (err.meta as { code?: string } | undefined)?.code;
    if (pgCode === "23P01") return true;
  }
  return err instanceof Error && err.message.includes("23P01");
}

const HOST_TIPS = [
  "Complete your profile to improve your listing visibility.",
  "Add more photos to your listing to attract more guests.",
  "Respond quickly to booking requests to improve your response rate.",
  "Keep your listing description detailed and accurate to set clear expectations.",
  "Set competitive prices to attract more bookings.",
  "Upload portfolio images to show guests the quality of your work.",
  "A fast response time builds trust with potential guests.",
];

const GUEST_TIPS = [
  "Message your host if you have any questions before the booking starts.",
  "Read the listing description carefully before confirming.",
  "Make sure to confirm pickup details with your host in the chat.",
  "Leave a review after your booking to help other guests make decisions.",
  "Your booking price is locked - no surprise charges.",
];

async function sendRandomTip(userId: string, tips: string[]) {
  const tip = tips[Math.floor(Math.random() * tips.length)];
  await createNotification(userId, NotificationType.TIP, tip);
}

async function recordCommission(
  hostId: string,
  bookingId: string,
  totalAmount: number,
  rate: number,
) {
  try {
    const amount = new Prisma.Decimal(totalAmount).mul(rate);
    // Unique on bookingId makes this idempotent — re-completing a booking
    // never records a second commission.
    await prisma.commissionLedger.upsert({
      where: { bookingId },
      update: {},
      create: {
        bookingId,
        hostId,
        amount,
        rate: new Prisma.Decimal(rate),
      },
    });
  } catch (err) {
    console.error("Commission recording failed:", err);
  }
}

export async function createBooking(
  guestId: string,
  data: CreateBookingInput,
): Promise<Prisma.BookingGetPayload<{ include: { history: true } }>> {
  const listing = await prisma.listing.findUnique({
    where: { id: data.listingId, deletedAt: null },
    select: {
      id: true,
      hostId: true,
      status: true,
      pricePerDay: true,
      currency: true,
      title: true,
    },
  });

  if (!listing) throw new AppError(404, "Listing not found");
  if (listing.status !== ListingStatus.ACTIVE) {
    throw new AppError(400, "Listing is not available for booking");
  }
  if (listing.hostId === guestId) {
    throw new AppError(400, "You cannot book your own listing");
  }

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);

  if (end <= start) {
    throw new AppError(400, "End date must be after start date");
  }

  const totalDays = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );

  const priceSnapshot = Number(listing.pricePerDay);
  const totalAmount = data.isNegotiable
    ? (data.budgetMax ?? 0)
    : priceSnapshot * totalDays;

  const activeBooking = await prisma.booking.findFirst({
    where: {
      guestId,
      status: {
        notIn: [
          BookingStatus.CANCELLED,
          BookingStatus.COMPLETED,
          BookingStatus.DISPUTED,
          NEGOTIATION_FAILED_STATUS,
        ],
      },
    },
  });

  if (activeBooking) {
    throw new AppError(400, "You already have an active booking");
  }

  // The overlap check and the create run in one transaction so two concurrent
  // requests can't both pass the check and double-book. The DB-level exclusion
  // constraint (no_overlapping_bookings) is the ultimate guard; if it fires we
  // translate it into the same friendly 409 the application check produces.
  let booking: Prisma.BookingGetPayload<{ include: { history: true } }>;
  try {
    booking = await prisma.$transaction(async (tx) => {
      const overlapping = await tx.booking.findFirst({
        where: {
          listingId: data.listingId,
          status: {
            notIn: [
              BookingStatus.CANCELLED,
              BookingStatus.COMPLETED,
              BookingStatus.DISPUTED,
              NEGOTIATION_FAILED_STATUS,
            ],
          },
          AND: [{ startDate: { lt: end } }, { endDate: { gt: start } }],
        },
      });

      if (overlapping) {
        throw new AppError(409, "Listing is already booked for these dates");
      }

      return tx.booking.create({
        data: {
          guestId,
          hostId: listing.hostId,
          listingId: data.listingId,
          startDate: start,
          endDate: end,
          totalDays,
          priceSnapshot,
          currency: listing.currency,
          totalAmount,
          pickupType: data.pickupType,
          pickupLocation: data.pickupLocation,
          notes: data.notes,
          isNegotiable: data.isNegotiable ?? false,
          budgetMin:
            data.isNegotiable && data.budgetMin ? data.budgetMin : undefined,
          budgetMax:
            data.isNegotiable && data.budgetMax ? data.budgetMax : undefined,
          currentOffer:
            data.isNegotiable && data.budgetMax ? data.budgetMax : undefined,
          negotiationExpiresAt: data.isNegotiable
            ? new Date(Date.now() + 2 * 60 * 60 * 1000)
            : undefined,
          lastActorId: data.isNegotiable ? guestId : undefined,
          history: {
            create: {
              fromStatus: null,
              toStatus: BookingStatus.PENDING,
              changedById: guestId,
              reason: "Booking created",
            },
          },
        },
        include: { history: true },
      });
    });
  } catch (err) {
    if (isExclusionViolation(err)) {
      throw new AppError(409, "Listing is already booked for these dates");
    }
    throw err;
  }

  await createNotification(
    listing.hostId,
    NotificationType.BOOKING_CREATED,
    `New booking request for "${listing.title}" - review and confirm.`,
    booking.id,
  );

  const hostBookingCount = await prisma.booking.count({
    where: { hostId: listing.hostId },
  });
  if (hostBookingCount === 1) {
    await createNotification(
      listing.hostId,
      NotificationType.FIRST_BOOKING,
      "Congratulations on your first booking request! You are officially a Lenda host.",
      booking.id,
    );
  }

  await sendRandomTip(guestId, GUEST_TIPS);
  await sendRandomTip(listing.hostId, HOST_TIPS);

  return booking;
}

type TransitionMap = {
  [key: string]: { to: BookingStatus[]; allowedRoles: Role[] }[];
};

const RENTAL_TRANSITIONS: TransitionMap = {
  [BookingStatus.PENDING]: [
    { to: [BookingStatus.CONFIRMED], allowedRoles: ["HOST"] },
    { to: [BookingStatus.CANCELLED], allowedRoles: ["HOST", "GUEST", "ADMIN"] },
  ],
  [BookingStatus.CONFIRMED]: [
    { to: [BookingStatus.EN_ROUTE], allowedRoles: ["HOST", "GUEST"] },
    { to: [BookingStatus.CANCELLED], allowedRoles: ["HOST", "GUEST", "ADMIN"] },
  ],
  [BookingStatus.EN_ROUTE]: [
    { to: [BookingStatus.HANDED_OVER], allowedRoles: ["HOST", "GUEST"] },
    { to: [BookingStatus.DISPUTED], allowedRoles: ["HOST", "GUEST", "ADMIN"] },
  ],
  [BookingStatus.HANDED_OVER]: [
    { to: [BookingStatus.ACTIVE], allowedRoles: ["ADMIN"] },
    { to: [BookingStatus.DISPUTED], allowedRoles: ["HOST", "GUEST", "ADMIN"] },
  ],
  [BookingStatus.ACTIVE]: [
    { to: [BookingStatus.RETURN_PENDING], allowedRoles: ["HOST", "GUEST"] },
    { to: [BookingStatus.DISPUTED], allowedRoles: ["HOST", "GUEST", "ADMIN"] },
  ],
  [BookingStatus.RETURN_PENDING]: [
    { to: [BookingStatus.RETURNED], allowedRoles: ["ADMIN"] },
    { to: [BookingStatus.DISPUTED], allowedRoles: ["HOST", "GUEST", "ADMIN"] },
  ],
  [BookingStatus.RETURNED]: [
    { to: [BookingStatus.COMPLETED], allowedRoles: ["ADMIN"] },
  ],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.DISPUTED]: [
    { to: [BookingStatus.COMPLETED], allowedRoles: ["ADMIN"] },
    { to: [BookingStatus.CANCELLED], allowedRoles: ["ADMIN"] },
  ],
  NEGOTIATION_FAILED: [],
};

const SERVICE_TRANSITIONS: TransitionMap = {
  [BookingStatus.PENDING]: [
    { to: [BookingStatus.CONFIRMED], allowedRoles: ["HOST"] },
    { to: [BookingStatus.CANCELLED], allowedRoles: ["HOST", "GUEST", "ADMIN"] },
  ],
  [BookingStatus.CONFIRMED]: [
    { to: [BookingStatus.ACTIVE], allowedRoles: ["HOST", "GUEST"] },
    { to: [BookingStatus.CANCELLED], allowedRoles: ["HOST", "GUEST", "ADMIN"] },
  ],
  [BookingStatus.ACTIVE]: [
    { to: [BookingStatus.COMPLETED], allowedRoles: ["HOST", "GUEST"] },
    { to: [BookingStatus.DISPUTED], allowedRoles: ["HOST", "GUEST", "ADMIN"] },
  ],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.DISPUTED]: [
    { to: [BookingStatus.COMPLETED], allowedRoles: ["ADMIN"] },
    { to: [BookingStatus.CANCELLED], allowedRoles: ["ADMIN"] },
  ],
  [BookingStatus.EN_ROUTE]: [],
  [BookingStatus.HANDED_OVER]: [],
  [BookingStatus.RETURN_PENDING]: [],
  [BookingStatus.RETURNED]: [],
  NEGOTIATION_FAILED: [],
};

export async function transitionBookingStatus(
  bookingId: string,
  toStatus: BookingStatus,
  changedById: string,
  roles: Role[],
  reason?: string,
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      guestId: true,
      hostId: true,
      listingId: true,
      totalAmount: true,
      listing: { select: { pillar: true, title: true } },
    },
  });

  if (!booking) throw new AppError(404, "Booking not found");

  const isParty =
    booking.guestId === changedById || booking.hostId === changedById;
  const isAdmin = roles.includes("ADMIN");

  if (!isParty && !isAdmin) {
    throw new AppError(403, "You are not a party to this booking");
  }

  const transitionMap =
    booking.listing.pillar === "RENTAL"
      ? RENTAL_TRANSITIONS
      : SERVICE_TRANSITIONS;

  const allowedTransitions = transitionMap[booking.status] ?? [];
  const match = allowedTransitions.find((t) => t.to.includes(toStatus));

  if (!match) {
    throw new AppError(
      400,
      `Invalid transition from ${booking.status} to ${toStatus}`,
    );
  }

  const hasRole = roles.some((r) => match.allowedRoles.includes(r));
  if (!hasRole) {
    throw new AppError(403, "Your role is not allowed to make this transition");
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: toStatus,
      history: {
        create: {
          fromStatus: booking.status,
          toStatus,
          changedById,
          reason: reason ?? null,
        },
      },
    },
    include: { history: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (booking.listing.pillar === "RENTAL") {
    if (toStatus === BookingStatus.HANDED_OVER) {
      await createHandover(bookingId, HandoverType.PICKUP);
    }
    if (toStatus === BookingStatus.RETURN_PENDING) {
      await createHandover(bookingId, HandoverType.RETURN);
    }
  }

  if (toStatus === BookingStatus.COMPLETED) {
    await recalculateDiscoveryScore(booking.listingId);

    const host = await prisma.user.findUnique({
      where: { id: booking.hostId },
      select: { commissionRate: true },
    });

    const totalAmount = parseFloat(booking.totalAmount.toString());
    const commissionRate = host?.commissionRate
      ? parseFloat(host.commissionRate.toString())
      : 0.15;

    await recordCommission(
      booking.hostId,
      booking.id,
      totalAmount,
      commissionRate,
    );

    await createNotification(
      booking.guestId,
      NotificationType.BOOKING_COMPLETED,
      `Your booking for "${booking.listing.title}" is complete. Leave a review!`,
      bookingId,
    );
    await createNotification(
      booking.hostId,
      NotificationType.BOOKING_COMPLETED,
      `Booking for "${booking.listing.title}" completed. Earnings have been added to your float.`,
      bookingId,
    );

    const completedCount = await prisma.booking.count({
      where: { hostId: booking.hostId, status: BookingStatus.COMPLETED },
    });
    if (completedCount === 1) {
      await createNotification(
        booking.hostId,
        NotificationType.FIRST_BOOKING,
        "You completed your first booking on Lenda! Keep it up - more bookings mean better visibility.",
        bookingId,
      );
    }
  }

  if (toStatus === BookingStatus.CONFIRMED) {
    await createNotification(
      booking.guestId,
      NotificationType.BOOKING_CONFIRMED,
      `Your booking for "${booking.listing.title}" has been confirmed by the host.`,
      bookingId,
    );
    await sendRandomTip(booking.hostId, HOST_TIPS);
  }

  if (toStatus === BookingStatus.CANCELLED) {
    const otherPartyId =
      changedById === booking.guestId ? booking.hostId : booking.guestId;
    await createNotification(
      otherPartyId,
      NotificationType.BOOKING_CANCELLED,
      `A booking for "${booking.listing.title}" has been cancelled.`,
      bookingId,
    );
  }

  if (toStatus === BookingStatus.EN_ROUTE) {
    await createNotification(
      booking.guestId,
      NotificationType.BOOKING_EN_ROUTE,
      `Your host is on the way for "${booking.listing.title}". Get ready for the handover.`,
      bookingId,
    );
    await createNotification(
      booking.hostId,
      NotificationType.BOOKING_EN_ROUTE,
      `En route confirmed for "${booking.listing.title}".`,
      bookingId,
    );
  }

  if (toStatus === BookingStatus.HANDED_OVER) {
    await createNotification(
      booking.guestId,
      NotificationType.HANDOVER_CONFIRMED,
      `Item handed over for "${booking.listing.title}" - please confirm receipt in the app.`,
      bookingId,
    );
    await createNotification(
      booking.hostId,
      NotificationType.HANDOVER_CONFIRMED,
      `Handover marked for "${booking.listing.title}" - awaiting guest confirmation.`,
      bookingId,
    );
  }

  if (toStatus === BookingStatus.ACTIVE) {
    await createNotification(
      booking.guestId,
      NotificationType.BOOKING_ACTIVE,
      `Your booking for "${booking.listing.title}" is now active. Enjoy!`,
      bookingId,
    );
    await createNotification(
      booking.hostId,
      NotificationType.BOOKING_ACTIVE,
      `Booking for "${booking.listing.title}" is now active.`,
      bookingId,
    );
  }

  if (toStatus === BookingStatus.RETURN_PENDING) {
    await createNotification(
      booking.hostId,
      NotificationType.BOOKING_RETURN_PENDING,
      `Return initiated for "${booking.listing.title}". Confirm receipt when the item is back.`,
      bookingId,
    );
    await createNotification(
      booking.guestId,
      NotificationType.BOOKING_RETURN_PENDING,
      `Return process started for "${booking.listing.title}". Both parties must confirm.`,
      bookingId,
    );
  }

  return updated;
}

export async function createHandover(bookingId: string, type: HandoverType) {
  return prisma.handover.create({
    data: { bookingId, type },
  });
}

export async function confirmHandover(
  bookingId: string,
  userId: string,
  type: HandoverType,
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      guestId: true,
      hostId: true,
      status: true,
      totalAmount: true,
      listingId: true,
      listing: { select: { title: true } },
    },
  });

  if (!booking) throw new AppError(404, "Booking not found");

  const isGuest = booking.guestId === userId;
  const isHost = booking.hostId === userId;

  if (!isGuest && !isHost) {
    throw new AppError(403, "You are not a party to this booking");
  }

  const handover = await prisma.handover.findFirst({
    where: { bookingId, type },
  });

  if (!handover) throw new AppError(404, "Handover record not found");
  if (handover.guestConfirmedAt && handover.hostConfirmedAt) {
    throw new AppError(400, "Handover already completed");
  }

  const updateData = isGuest
    ? { guestConfirmed: true, guestConfirmedAt: new Date() }
    : { hostConfirmed: true, hostConfirmedAt: new Date() };

  const updated = await prisma.handover.update({
    where: { id: handover.id },
    data: updateData,
  });

  const bothConfirmed =
    (isGuest && updated.guestConfirmed && handover.hostConfirmed) ||
    (isHost && updated.hostConfirmed && handover.guestConfirmed);

  if (bothConfirmed) {
    const nextStatus =
      type === HandoverType.PICKUP
        ? BookingStatus.ACTIVE
        : BookingStatus.COMPLETED;

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: nextStatus,
        history: {
          create: {
            fromStatus: booking.status,
            toStatus: nextStatus,
            changedById: userId,
            reason: `${type === HandoverType.PICKUP ? "Pickup" : "Return"} handover confirmed by both parties`,
          },
        },
      },
    });

    if (nextStatus === BookingStatus.ACTIVE) {
      await createNotification(
        booking.guestId,
        NotificationType.BOOKING_ACTIVE,
        `Your booking for "${booking.listing.title}" is now active. Enjoy!`,
        bookingId,
      );
      await createNotification(
        booking.hostId,
        NotificationType.BOOKING_ACTIVE,
        `Booking for "${booking.listing.title}" is now active.`,
        bookingId,
      );
    }

    if (nextStatus === BookingStatus.COMPLETED) {
      await recalculateDiscoveryScore(booking.listingId);

      const host = await prisma.user.findUnique({
        where: { id: booking.hostId },
        select: { commissionRate: true },
      });

      const totalAmount = parseFloat(booking.totalAmount.toString());
      const commissionRate = host?.commissionRate
        ? parseFloat(host.commissionRate.toString())
        : 0.15;

      await recordCommission(
        booking.hostId,
        bookingId,
        totalAmount,
        commissionRate,
      );

      await createNotification(
        booking.guestId,
        NotificationType.BOOKING_COMPLETED,
        `Your booking for "${booking.listing.title}" is complete. Leave a review!`,
        bookingId,
      );
      await createNotification(
        booking.hostId,
        NotificationType.BOOKING_COMPLETED,
        `Booking for "${booking.listing.title}" completed. Earnings have been added to your float.`,
        bookingId,
      );

      const completedCount = await prisma.booking.count({
        where: { hostId: booking.hostId, status: BookingStatus.COMPLETED },
      });
      if (completedCount === 1) {
        await createNotification(
          booking.hostId,
          NotificationType.FIRST_BOOKING,
          "You completed your first booking on Lenda! Keep it up - more bookings mean better visibility.",
          bookingId,
        );
      }
    }
  }

  return updated;
}

export async function getBookings(
  userId: string,
  roles: Role[],
  pagination: PaginationParams,
) {
  const isHost = roles.includes("HOST");
  const isGuest = roles.includes("GUEST");
  const isAdmin = roles.includes("ADMIN");

  const where = isAdmin
    ? {}
    : isHost && !isGuest
      ? { hostId: userId }
      : isGuest && !isHost
        ? { guestId: userId }
        : { OR: [{ guestId: userId }, { hostId: userId }] };

  const { cursor, limit } = pagination;

  const items = await prisma.booking.findMany({
    where,
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          category: true,
          location: true,
          images: { where: { isPrimary: true } },
        },
      },
      guest: { select: { id: true, fullName: true, email: true } },
      host: { select: { id: true, fullName: true, email: true } },
      history: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  return { items, nextCursor: buildNextCursor(items, limit) };
}

export async function getBookingById(
  bookingId: string,
  userId: string,
  roles: Role[],
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          category: true,
          pillar: true,
          location: true,
          pricePerDay: true,
          images: { orderBy: { order: "asc" } },
        },
      },
      history: { orderBy: { createdAt: "asc" } },
      handovers: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!booking) throw new AppError(404, "Booking not found");

  const isAdmin = roles.includes("ADMIN");
  const isParty = booking.guestId === userId || booking.hostId === userId;

  if (!isParty && !isAdmin) {
    throw new AppError(403, "You are not a party to this booking");
  }

  return booking;
}
