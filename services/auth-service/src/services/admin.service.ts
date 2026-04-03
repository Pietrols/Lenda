import { prisma, KycStatus, NotificationType } from "@lenda/database";
import { AppError } from "../lib/AppError";

export async function approveKyc(userId: string, adminId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
  });

  if (!user) throw new AppError("User not found", 404);
  if (user.kycStatus === KycStatus.APPROVED) {
    throw new AppError("User is already verified", 400);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      kycStatus: KycStatus.APPROVED,
      listingTier: user.listingTier === 0 ? 1 : user.listingTier,
      notifications: {
        create: {
          type: NotificationType.KYC_APPROVED,
          message:
            "Your account has been verified. You can now create listings.",
        },
      },
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      kycStatus: true,
      listingTier: true,
    },
  });

  return updated;
}

export async function rejectKyc(
  userId: string,
  adminId: string,
  reason?: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
  });

  if (!user) throw new AppError("User not found", 404);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      kycStatus: KycStatus.REJECTED,
      notifications: {
        create: {
          type: NotificationType.KYC_REJECTED,
          message: reason
            ? `Your verification was rejected: ${reason}`
            : "Your verification was rejected. Please contact support.",
        },
      },
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      kycStatus: true,
    },
  });

  return updated;
}

export async function awardBadge(
  userId: string,
  adminId: string,
  label: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
  });

  if (!user) throw new AppError("User not found", 404);
  if (!label?.trim()) throw new AppError("Badge label is required", 400);

  const badge = await prisma.badge.create({
    data: { userId, awardedById: adminId, label },
  });

  await prisma.notification.create({
    data: {
      userId,
      type: NotificationType.BADGE_AWARDED,
      message: `You have been awarded the "${label}" badge`,
    },
  });

  return badge;
}

export async function suspendUser(
  userId: string,
  adminId: string,
  suspend: boolean = true,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
  });

  if (!user) throw new AppError("User not found", 404);

  if (suspend && !user.isActive) {
    throw new AppError("User is already suspended", 400);
  }
  if (!suspend && user.isActive) {
    throw new AppError("User is not suspended", 400);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: !suspend },
    select: {
      id: true,
      email: true,
      fullName: true,
      isActive: true,
    },
  });

  return updated;
}
