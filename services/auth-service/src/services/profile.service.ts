import { prisma } from "@lenda/database";
import type { UpdateProfileInput } from "@lenda/schemas";
import { AppError } from "../lib/AppError";
import { supabase } from "../lib/supabase";
import heicConvert from "heic-convert";
import sharp from "sharp";

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
): Promise<any> {
  let buffer = file.buffer;
  let ext = file.originalname.split(".").pop()?.toLowerCase() ?? "jpg";

  const isHeic =
    file.mimetype === "image/heic" ||
    file.mimetype === "image/heif" ||
    ext === "heic" ||
    ext === "heif";

  if (isHeic) {
    const converted = await heicConvert({
      buffer: file.buffer,
      format: "JPEG",
      quality: 0.9,
    });
    buffer = Buffer.from(converted);
    ext = "jpg";
  }

  // Compress and resize with sharp
  buffer = await sharp(buffer)
    .resize(400, 400, { fit: "cover", position: "centre" })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();

  ext = "jpg";

  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from("profiles")
    .upload(path, buffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("profiles").getPublicUrl(path);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { photoUrl: data.publicUrl },
    select: { id: true, photoUrl: true },
  });

  return updated;
}

export async function getUploadSignature(userId: string) {
  const path = `${userId}/avatar`;

  const { data, error } = await supabase.storage
    .from("profiles")
    .createSignedUploadUrl(path);

  if (error) throw new Error(error.message);

  return {
    signedUrl: data.signedUrl,
    path: data.path,
    token: data.token,
    supabaseUrl: process.env.SUPABASE_URL,
  };
}

export async function saveProfilePhoto(userId: string, photoUrl: string) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { photoUrl },
    select: { id: true, photoUrl: true },
  });
  return updated;
}
