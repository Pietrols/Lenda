import { prisma } from "@lenda/database";
import type { UpdateProfileInput } from "@lenda/schemas";
import { AppError } from "../lib/AppError";
import { cloudinary } from "../lib/cloudinary";
import heicConvert from "heic-convert";

export async function updateProfile(userId: string, data: UpdateProfileInput) {
  if (data.phone) {
    const existing = await prisma.user.findFirst({
      where: { phone: data.phone, NOT: { id: userId } },
    });
    if (existing) throw new AppError("Phone number already in use", 409);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      phone: true,
      fullName: true,
      photoUrl: true,
      bio: true,
      location: true,
      roles: true,
      kycStatus: true,
      listingTier: true,
      subscriptionPlan: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updated;
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      email: true,
      phone: true,
      fullName: true,
      photoUrl: true,
      bio: true,
      location: true,
      roles: true,
      kycStatus: true,
      listingTier: true,
      subscriptionPlan: true,
      badges: true,
      createdAt: true,
    },
  });

  if (!user) throw new AppError("User not found", 404);
  return user;
}

export async function uploadProfilePhoto(
  userId: string,
  file: Express.Multer.File,
) {
  let buffer = file.buffer;

  if (
    file.mimetype === "image/heic" ||
    file.mimetype === "image/heif" ||
    file.originalname.toLowerCase().endsWith(".heic") ||
    file.originalname.toLowerCase().endsWith(".heif")
  ) {
    const converted = await heicConvert({
      buffer: file.buffer,
      format: "JPEG",
      quality: 0.9,
    });
    buffer = Buffer.from(converted);
  }

  const result = await new Promise<any>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: "lenda/profiles",
          public_id: userId,
          overwrite: true,
          transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "face" },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      )
      .end(buffer);
  });

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { photoUrl: result.secure_url },
    select: { id: true, photoUrl: true },
  });

  return updated;
}
