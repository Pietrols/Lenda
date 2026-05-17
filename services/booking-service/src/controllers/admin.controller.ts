import { Request, Response, NextFunction } from "express";
import { prisma } from "@lenda/database";
import {
  verifyListing,
  suspendListing,
  removeReview,
  boostUserDiscovery,
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

export async function boostUserDiscoveryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const amount = Number(req.body.amount) || 10;
    const result = await boostUserDiscovery(
      req.params.id,
      req.user!.sub,
      amount,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getAllReviewsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        reviewer: { select: { id: true, fullName: true, email: true } },
        reviewee: { select: { id: true, fullName: true, email: true } },
        booking: {
          select: {
            id: true,
            listing: { select: { id: true, title: true } },
          },
        },
      },
    });
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
}
