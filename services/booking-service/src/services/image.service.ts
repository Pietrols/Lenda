import { prisma } from "@lenda/database";
import { AppError } from "../middleware/errorHandler";
import { supabase } from "../lib/supabase";

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

  const ext = file.originalname.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `${Date.now()}.${ext}`;
  const path = `${listingId}/${filename}`;

  const { error } = await supabase.storage
    .from("listings")
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) throw new AppError(500, error.message);

  const { data } = supabase.storage.from("listings").getPublicUrl(path);

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
      url: data.publicUrl,
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

  // Extract path from URL
  const url = new URL(image.url);
  const path = url.pathname.split("/listings/")[1];

  await supabase.storage.from("listings").remove([path]);
  await prisma.listingImage.delete({ where: { id: imageId } });
}
