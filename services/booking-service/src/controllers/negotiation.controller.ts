import { Request, Response, NextFunction } from "express";
import { submitCounter, acceptOffer } from "../services/negotiation.service";
import { AppError } from "../middleware/errorHandler";

export async function submitCounterHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return next(new AppError(401, "Unauthorized"));
    const { id } = req.params;
    const userId = req.user.sub;
    const { amount } = req.body;

    if (!amount || isNaN(Number(amount))) {
      res.status(400).json({ message: "A valid counter amount is required." });
      return;
    }

    const booking = await submitCounter(id, userId, Number(amount));
    res.json({ booking });
  } catch (err) {
    next(err);
  }
}

export async function acceptOfferHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return next(new AppError(401, "Unauthorized"));
    const { id } = req.params;
    const userId = req.user.sub;
    const booking = await acceptOffer(id, userId);
    res.json({ booking });
  } catch (err) {
    next(err);
  }
}
