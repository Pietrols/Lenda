import { Request, Response, NextFunction } from "express";
import {
  verifyListing,
  suspendListing,
  removeReview,
} from "../services/admin.service";

export async function verifyListingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const listing = await verifyListing(req.params.id, req.user!.sub);
    res.json({ listing });
  } catch (err) {
    next(err);
  }
}

export async function suspendListingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const listing = await suspendListing(req.params.id, req.user!.sub);
    res.json({ listing });
  } catch (err) {
    next(err);
  }
}

export async function removeReviewHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { note } = req.body;
    const review = await removeReview(req.params.id, req.user!.sub, note);
    res.json({ review });
  } catch (err) {
    next(err);
  }
}
