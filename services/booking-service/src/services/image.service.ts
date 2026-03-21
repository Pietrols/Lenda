import { prisma } from "@lenda/database";
import { cloudinary } from "../lib/cloudinary";
import { AppError } from "../middleware/errorHandler";

export async function uploadListingImage(
  listingId: string,
  hostId: string,
  file: Express.Multer.File,
  isPrimary: boolean = false,
  altText?: string,
) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId, deletedAt: null },
    select: { hostId: true },
  });

  if (!listing) throw new AppError(404, "Listing not found");
  if (listing.hostId !== hostId) {
    throw new AppError(403, "You do not own this listing");
  }

  const result = await new Promise<any>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `lenda/listings/${listingId}`,
          transformation: [{ width: 1200, height: 800, crop: "fill" }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      )
      .end(file.buffer);
  });

  if (isPrimary) {
    await prisma.listingImage.updateMany({
      where: { listingId },
      data: { isPrimary: false },
    });
  }

  const lastImage = await prisma.listingImage.findFirst({
    where: { listingId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const order = (lastImage?.order ?? -1) + 1;

  const image = await prisma.listingImage.create({
    data: {
      listingId,
      url: result.secure_url,
      altText,
      isPrimary,
      order,
    },
  });

  return image;
}

export async function deleteListingImage(imageId: string, hostId: string) {
  const image = await prisma.listingImage.findUnique({
    where: { id: imageId },
    include: { listing: { select: { hostId: true } } },
  });

  if (!image) throw new AppError(404, "Image not found");
  if (image.listing.hostId !== hostId) {
    throw new AppError(403, "You do not own this listing");
  }

  const publicId = image.url
    .split("/upload/")[1]
    .split(".")
    .slice(0, -1)
    .join(".");

  await cloudinary.uploader.destroy(publicId);
  await prisma.listingImage.delete({ where: { id: imageId } });
}
