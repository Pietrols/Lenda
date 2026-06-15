import { Request, Response, NextFunction } from "express";
import { createBooking } from "../services/booking.service";
import { transitionBookingStatus } from "../services/booking.service";
import { BookingStatus } from "@lenda/database";
import { confirmHandover } from "../services/booking.service";
import { HandoverType } from "@lenda/database";
import { getBookings, getBookingById } from "../services/booking.service";
import { parsePagination } from "../lib/pagination";

type Role = "GUEST" | "HOST" | "ADMIN";

export async function createBookingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const guestId = req.user!.sub;
    const booking = await createBooking(guestId, req.body);
    res.status(201).json({ booking });
  } catch (err) {
    next(err);
  }
}

export async function transitionBookingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const changedById = req.user!.sub;
    const roles = req.user!.roles as ("GUEST" | "HOST" | "ADMIN")[];

    if (!Object.values(BookingStatus).includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const booking = await transitionBookingStatus(
      id,
      status as BookingStatus,
      changedById,
      roles,
      reason,
    );

    res.json({ booking });
  } catch (err) {
    next(err);
  }
}

export async function confirmHandoverHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;
    const { type } = req.body;
    const userId = req.user!.sub;

    if (!Object.values(HandoverType).includes(type)) {
      return res.status(400).json({ message: "Invalid handover type" });
    }

    const handover = await confirmHandover(id, userId, type as HandoverType);
    res.json({ handover });
  } catch (err) {
    next(err);
  }
}

export async function getBookingsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.sub;
    const roles = req.user!.roles as Role[];
    const pagination = parsePagination(req.query);
    const { items, nextCursor } = await getBookings(userId, roles, pagination);
    // Legacy key `bookings` kept for backward compatibility; `nextCursor`
    // added for cursor-paginating clients.
    res.json({ bookings: items, nextCursor });
  } catch (err) {
    next(err);
  }
}

export async function getBookingByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.sub;
    const roles = req.user!.roles as Role[];
    const booking = await getBookingById(req.params.id, userId, roles);
    res.json({ booking });
  } catch (err) {
    next(err);
  }
}
