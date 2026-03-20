import { Request, Response, NextFunction } from "express";
import { createListing } from "../services/listing.service";
import { getListings, getListingById } from "../services/listing.service";
import { GetListingsQuerySchema } from "@lenda/schemas";

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

export async function getListingsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const query = GetListingsQuerySchema.parse(req.query);
    const result = await getListings(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getListingByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const listing = await getListingById(req.params.id);
    res.json({ listing });
  } catch (err) {
    next(err);
  }
}
