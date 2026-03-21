import { Request, Response, NextFunction } from "express";
import {
  createReview,
  getReviewsForListing,
  getReviewsForUser,
} from "../services/review.service";

export async function createReviewHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const reviewerId = req.user!.sub;
    const review = await createReview(reviewerId, req.body);
    res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
}

export async function getListingReviewsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const reviews = await getReviewsForListing(req.params.listingId);
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
}

export async function getUserReviewsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const reviews = await getReviewsForUser(req.params.userId);
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
}
