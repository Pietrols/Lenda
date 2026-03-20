import { Request, Response, NextFunction } from "express";
import { createBooking } from "../services/booking.service";
import { transitionBookingStatus } from "../services/booking.service";
import { BookingStatus } from "@lenda/database";
import { confirmHandover } from "../services/booking.service";
import { HandoverType } from "@lenda/database";

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
