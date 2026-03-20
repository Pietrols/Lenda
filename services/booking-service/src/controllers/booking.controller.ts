import { Request, Response, NextFunction } from "express";
import { createBooking } from "../services/booking.service";

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
