import { prisma, KycStatus, NotificationType } from "@lenda/database";
import type { MessageResponse } from "@lenda/types";
import { AppError, Errors } from "../lib/AppError";
import { getSignedDownloadUrl } from "../lib/r2";
import { config } from "../config";

export async function approveKyc(
  userId: string,
  adminId: string,
): Promise<MessageResponse> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Errors.notFound("User not found.");

  await prisma.user.update({
    where: { id: userId },
    data: {
      kycStatus: "APPROVED" as any,
      listingTier: { increment: 1 },
    },
  });

  // Send notification to user
  await prisma.notification.create({
    data: {
      userId,
      type: "KYC_APPROVED" as any,
      message:
        "Congratulations! Your KYC verification has been approved. You can now create listings and start earning on Lenda.",
    },
  });

  return { message: "KYC approved successfully." };
}

export async function rejectKyc(
  userId: string,
  adminId: string,
  reason?: string,
): Promise<MessageResponse> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  // Full reset: remove HOST role, reset KYC to PENDING, delete documents
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: "PENDING" as any,
        roles: { set: user.roles.filter((r) => r !== ("HOST" as any)) },
      },
    }),
    (prisma as any).kycDocument.deleteMany({ where: { userId } }),
  ]);

  const rejectionMessage = reason
    ? `Unfortunately, your KYC verification was not approved. Reason: ${reason}. Please re-apply from the dashboard or contact support at hello@lenda.work.`
    : `Unfortunately, your KYC verification was not approved. Please re-apply with clear documents or contact support at hello@lenda.work.`;

  await prisma.notification.create({
    data: {
      userId,
      type: "KYC_REJECTED" as any,
      message: rejectionMessage,
    },
  });

  return { message: "KYC rejected and reset." };
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

export async function getKycDocuments(userId: string) {
  const docs = await (prisma as any).kycDocument.findMany({
    where: { userId },
    orderBy: { uploadedAt: "desc" },
  });
  return Promise.all(
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
}
