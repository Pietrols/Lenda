import { Request, Response, NextFunction } from "express";
import { submitCounter, acceptOffer } from "../services/negotiation.service";

export async function submitCounterHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.sub;
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
    const { id } = req.params;
    const userId = (req as any).user?.sub;
    const booking = await acceptOffer(id, userId);
    res.json({ booking });
  } catch (err) {
    next(err);
  }
}
