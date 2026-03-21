import { Request, Response, NextFunction } from "express";
import {
  uploadListingImage,
  deleteListingImage,
} from "../services/image.service";

export async function uploadListingImageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.file) throw new Error("No file uploaded");

    const hostId = req.user!.sub;
    const { listingId } = req.params;
    const isPrimary = req.body.isPrimary === "true";
    const altText = req.body.altText;

    const image = await uploadListingImage(
      listingId,
      hostId,
      req.file,
      isPrimary,
      altText,
    );

    res.status(201).json({ image });
  } catch (err) {
    next(err);
  }
}

export async function deleteListingImageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const hostId = req.user!.sub;
    const { imageId } = req.params;
    await deleteListingImage(imageId, hostId);
    res.json({ message: "Image deleted successfully" });
  } catch (err) {
    next(err);
  }
}
