import { Request, Response, NextFunction } from "express";
import {
  createListing,
  getListings,
  getListingsCursor,
  getListingById,
  getMyListings,
  getListingsByHost,
  updateListing,
  deleteListing,
} from "../services/listing.service";
import { GetListingsQuerySchema } from "@lenda/schemas";
import { parsePagination } from "../lib/pagination";

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
    // Cursor mode only when ?cursor= is supplied — otherwise the existing
    // offset response ({ listings, pagination }) is returned unchanged so the
    // web app is unaffected.
    if (typeof req.query.cursor === "string" && req.query.cursor.length > 0) {
      const pagination = parsePagination(req.query);
      const result = await getListingsCursor(query, pagination);
      res.json(result);
      return;
    }
    const result = await getListings(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMyListingsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const hostId = req.user!.sub;
    const listings = await getMyListings(hostId);
    res.json({ listings });
  } catch (err) {
    next(err);
  }
}

export async function getListingsByHostHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const listings = await getListingsByHost(req.params.hostId);
    res.json({ listings });
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

export async function updateListingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const hostId = req.user!.sub;
    const listing = await updateListing(req.params.id, hostId, req.body);
    res.json({ listing });
  } catch (err) {
    next(err);
  }
}

export async function deleteListingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const hostId = req.user!.sub;
    await deleteListing(req.params.id, hostId);
    res.json({ message: "Listing deleted successfully" });
  } catch (err) {
    next(err);
  }
}
