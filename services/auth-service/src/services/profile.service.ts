import { prisma } from "@lenda/database";
import type { UpdateProfileInput } from "@lenda/schemas";
import { AppError } from "../lib/AppError";
import { supabase } from "../lib/supabase";
import heicConvert from "heic-convert";
import sharp from "sharp";
import { uploadToR2 } from "../lib/r2";
import { config } from "../config";
import { getSignedDownloadUrl } from "../lib/r2";

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

  const [completedBookingsCount, reviews] = await Promise.all([
    prisma.booking.count({
      where: { hostId: userId, status: "COMPLETED" as any },
    }),
    prisma.review.findMany({
      where: { revieweeId: userId, isVisible: true },
      select: { rating: true },
    }),
  ]);

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

  return {
    ...user,
    completedBookings: completedBookingsCount,
    averageRating: averageRating ? Math.round(averageRating * 10) / 10 : null,
    reviewCount: reviews.length,
  };
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

  buffer = await sharp(buffer)
    .resize(400, 400, { fit: "cover", position: "centre" })
    .jpeg({ quality: 80, progressive: false })
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
    throw new AppError(
      `Invalid document type. Must be one of: ${validTypes.join(", ")}`,
      400,
    );
  }

  const isPdf =
    file.mimetype === "application/pdf" || /\.pdf$/i.test(file.originalname);

  let buffer = file.buffer;
  let contentType = file.mimetype;
  const ext = isPdf ? "pdf" : "jpg";

  if (!isPdf) {
    const isHeic =
      file.mimetype === "image/heic" ||
      file.mimetype === "image/heif" ||
      /\.(heic|heif)$/i.test(file.originalname);

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
      .jpeg({ quality: 80, progressive: false })
      .toBuffer();

    contentType = "image/jpeg";
  }

  const key = `${userId}/${docType.toLowerCase()}.${ext}`;

  const url = await uploadToR2(config.R2_KYC_BUCKET, key, buffer, contentType);

  const storedUrl = `r2://${config.R2_KYC_BUCKET}/${key}`;

  await (prisma as any).kycDocument.upsert({
    where: {
      userId_type: { userId, type: docType as any },
    },
    create: { userId, type: docType as any, url: storedUrl },
    update: { url: storedUrl, uploadedAt: new Date() },
  });

  return { url, type: docType };
}

export async function getKycDocuments(userId: string) {
  const docs = await (prisma as any).kycDocument.findMany({
    where: { userId },
    orderBy: { uploadedAt: "desc" },
  });

  // Generate fresh signed URLs for R2-stored documents
  const withUrls = await Promise.all(
    docs.map(async (doc: any) => {
      if (doc.url.startsWith("r2://")) {
        const key = doc.url.replace(`r2://${config.R2_KYC_BUCKET}/`, "");
        try {
          const signedUrl = await getSignedDownloadUrl(
            config.R2_KYC_BUCKET,
            key,
            3600,
          );
          return { ...doc, url: signedUrl };
        } catch {
          return doc;
        }
      }
      return doc;
    }),
  );

  return withUrls;
}

export async function resubmitKyc(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);
  if (user.kycStatus !== ("REJECTED" as any)) {
    throw new AppError("KYC can only be resubmitted after rejection", 400);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { kycStatus: "PENDING" as any },
    select: {
      id: true,
      email: true,
      kycStatus: true,
      roles: true,
      fullName: true,
      photoUrl: true,
    },
  });

  return updated;
}
