import { prisma, BookingStatus, ListingStatus, Prisma } from "@lenda/database";
import type { CreateBookingInput } from "@lenda/schemas";
import { AppError } from "../middleware/errorHandler";

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
