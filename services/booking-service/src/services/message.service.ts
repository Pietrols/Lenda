import { prisma } from "@lenda/database";
import { AppError } from "../middleware/errorHandler";

export async function sendMessage(
  bookingId: string,
  senderId: string,
  message: string,
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { guestId: true, hostId: true },
  });

  if (!booking) throw new AppError(404, "Booking not found");

  const isParty = booking.guestId === senderId || booking.hostId === senderId;
  if (!isParty) throw new AppError(403, "You are not a party to this booking");

  if (!message.trim()) throw new AppError(400, "Message cannot be empty");

  const msg = await prisma.bookingMessage.create({
    data: { bookingId, senderId, message: message.trim() },
    include: {
      sender: { select: { id: true, fullName: true, photoUrl: true } },
    },
  });

  return msg;
}

export async function getMessages(bookingId: string, userId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { guestId: true, hostId: true },
  });

  if (!booking) throw new AppError(404, "Booking not found");

  const isParty = booking.guestId === userId || booking.hostId === userId;
  if (!isParty) throw new AppError(403, "You are not a party to this booking");

  // Mark messages from the other party as read
  await prisma.bookingMessage.updateMany({
    where: { bookingId, senderId: { not: userId }, isRead: false },
    data: { isRead: true },
  });

  const messages = await prisma.bookingMessage.findMany({
    where: { bookingId },
    include: {
      sender: { select: { id: true, fullName: true, photoUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return messages;
}

export async function getUnreadCount(bookingId: string, userId: string) {
  const count = await prisma.bookingMessage.count({
    where: { bookingId, senderId: { not: userId }, isRead: false },
  });
  return count;
}
