import { Request, Response, NextFunction } from "express";
import { createListing } from "../services/listing.service";

export async function createListingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const hostId = req.user!.sub;
    const listing = await createListing(hostId, req.body);
    res.status(201).json({ listing });
  } catch (err) {
    next(err);
  }
}
