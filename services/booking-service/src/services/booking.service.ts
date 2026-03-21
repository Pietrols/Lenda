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

type Role = "GUEST" | "HOST" | "ADMIN";

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
  const totalAmount = priceSnapshot * totalDays;

  const overlapping = await prisma.booking.findFirst({
    where: {
      listingId: data.listingId,
      status: {
        notIn: [
          BookingStatus.CANCELLED,
          BookingStatus.COMPLETED,
          BookingStatus.DISPUTED,
        ],
      },
      AND: [{ startDate: { lt: end } }, { endDate: { gt: start } }],
    },
  });

  if (overlapping) {
    throw new AppError(409, "Listing is already booked for these dates");
  }

  const activeBooking = await prisma.booking.findFirst({
    where: {
      guestId,
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
    throw new AppError(400, "You already have an active booking");
  }

  const booking = await prisma.booking.create({
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

  return booking;
}

type TransitionMap = {
  [key in BookingStatus]: { to: BookingStatus[]; allowedRoles: Role[] }[];
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
  // These states are unreachable for SERVICE but required by the type
  [BookingStatus.EN_ROUTE]: [],
  [BookingStatus.HANDED_OVER]: [],
  [BookingStatus.RETURN_PENDING]: [],
  [BookingStatus.RETURNED]: [],
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
      listing: { select: { pillar: true } },
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

  const allowedTransitions = transitionMap[booking.status];
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

  // Auto-create handover records for RENTAL only
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
    select: { guestId: true, hostId: true, status: true },
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
    const now = new Date();
    const updateData = isGuest
      ? { guestConfirmed: true, guestConfirmedAt: now }
      : { hostConfirmed: true, hostConfirmedAt: now };

    const nextStatus =
      type === HandoverType.PICKUP
        ? BookingStatus.ACTIVE
        : BookingStatus.RETURNED;

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
  }

  return updated;
}

export async function getBookings(userId: string, roles: Role[]) {
  const isHost = roles.includes("HOST");
  const isGuest = roles.includes("GUEST");

  const where =
    isHost && !isGuest
      ? { hostId: userId }
      : isGuest && !isHost
        ? { guestId: userId }
        : { OR: [{ guestId: userId }, { hostId: userId }] };

  const bookings = await prisma.booking.findMany({
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
      history: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return bookings;
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
