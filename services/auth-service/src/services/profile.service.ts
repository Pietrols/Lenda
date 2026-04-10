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

export async function addRole(userId: string, role: string): Promise<any> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  const validRoles = ["GUEST", "HOST"];
  if (!validRoles.includes(role)) throw new AppError("Invalid role", 400);

  if (user.roles.includes(role as any)) {
    throw new AppError(`You already have the ${role} role`, 400);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { roles: { set: [...user.roles, role as any] } },
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

export async function uploadKycDocument(
  userId: string,
  docType: string,
  file: Express.Multer.File,
) {
  const validTypes = ["NRC_FRONT", "NRC_BACK", "PROOF_OF_RESIDENCE", "SELFIE"];
  if (!validTypes.includes(docType)) {
    throw new AppError("Invalid document type", 400);
  }

  let buffer = file.buffer;
  const isPdf =
    file.mimetype === "application/pdf" ||
    file.originalname.toLowerCase().endsWith(".pdf");
  const ext = isPdf ? "pdf" : "jpg";
  const contentType = isPdf ? "application/pdf" : "image/jpeg";

  if (!isPdf) {
    const isHeic =
      file.mimetype === "image/heic" ||
      file.mimetype === "image/heif" ||
      file.originalname.toLowerCase().match(/\.(heic|heif)$/);

    if (isHeic) {
      const converted = await heicConvert({
        buffer: file.buffer,
        format: "JPEG",
        quality: 0.9,
      });
      buffer = Buffer.from(converted);
    }

    buffer = await sharp(buffer)
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  }

  const path = `${userId}/${docType.toLowerCase()}.${ext}`;

  const { error } = await supabase.storage
    .from("kyc-documents")
    .upload(path, buffer, {
      contentType,
      upsert: true,
    });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("kyc-documents").getPublicUrl(path);

  await (prisma as any).kycDocument.upsert({
    where: {
      userId_type: { userId, type: docType as any },
    },
    create: { userId, type: docType as any, url: data.publicUrl },
    update: { url: data.publicUrl, uploadedAt: new Date() },
  });

  return { url: data.publicUrl, type: docType };
}
