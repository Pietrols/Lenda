import { prisma } from "@lenda/database";
import type { UpdateProfileInput } from "@lenda/schemas";
import { AppError } from "../lib/AppError";

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
