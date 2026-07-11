import { prisma, KycStatus, NotificationType } from "@lenda/database";
import type { MessageResponse } from "@lenda/types";
import { AppError, Errors } from "../lib/AppError";
import { getSignedDownloadUrl } from "../lib/r2";
import { config } from "../config";

// Free launch period: every newly approved host starts at the top tier so
// the listing limit never blocks anyone. The tier automation in
// booking-service keeps computing real tiers in the background (it never
// demotes), so reverting to earned tiers later only requires lowering this
// starting value again.
const LAUNCH_LISTING_TIER = 3;

export async function approveKyc(userId: string, adminId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Errors.notFound("User not found.");
  if (user.kycStatus === ("APPROVED" as any))
    throw Errors.badRequest("User KYC is already approved.");

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      kycStatus: "APPROVED" as any,
      listingTier: Math.max(user.listingTier, LAUNCH_LISTING_TIER),
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      roles: true,
      kycStatus: true,
      isActive: true,
      subscriptionPlan: true,
      listingTier: true,
      createdAt: true,
    },
  });

  await prisma.notification.create({
    data: {
      userId,
      type: "KYC_APPROVED" as any,
      message:
        "Congratulations! Your KYC verification has been approved. You can now create listings and start earning on Lenda.",
    },
  });

  return updated;
}

export async function rejectKyc(
  userId: string,
  adminId: string,
  reason?: string,
): Promise<MessageResponse> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

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
  durationDays?: number,
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
  if (durationDays !== undefined) {
    if (!Number.isInteger(durationDays) || durationDays <= 0) {
      throw new AppError("durationDays must be a positive whole number", 400);
    }
    if (durationDays > 365) {
      throw new AppError("durationDays cannot exceed 365", 400);
    }
  }

  // A suspension with a duration expires on its own (checked at login);
  // without one it is permanent until an admin lifts it. Unsuspending
  // always clears any remaining expiry.
  const suspendedUntil =
    suspend && durationDays !== undefined
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      : null;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: !suspend, suspendedUntil },
    select: {
      id: true,
      email: true,
      fullName: true,
      isActive: true,
      suspendedUntil: true,
    },
  });

  return updated;
}

export async function grantPro(
  userId: string,
  adminId: string,
  plan: "PRO_MONTHLY" | "PRO_ANNUAL",
) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
  });
  if (!user) throw new AppError("User not found", 404);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { subscriptionPlan: plan as any },
    select: { id: true, email: true, subscriptionPlan: true },
  });

  const label = plan === "PRO_ANNUAL" ? "Pro Annual" : "Pro Monthly";
  await prisma.notification.create({
    data: {
      userId,
      type: NotificationType.TIER_UPGRADED,
      message: `Your account has been upgraded to ${label} by the Lenda team. Enjoy your extra listing slots and boosted visibility!`,
    },
  });

  return updated;
}

export async function revokePro(userId: string, adminId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
  });
  if (!user) throw new AppError("User not found", 404);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { subscriptionPlan: "FREE" as any },
    select: { id: true, email: true, subscriptionPlan: true },
  });

  return updated;
}

export async function adjustListingTier(
  userId: string,
  adminId: string,
  tier: number,
) {
  if (tier < 0 || tier > 3) throw new AppError("Tier must be 0 to 3", 400);

  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
  });
  if (!user) throw new AppError("User not found", 404);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { listingTier: tier },
    select: { id: true, email: true, listingTier: true },
  });

  await prisma.notification.create({
    data: {
      userId,
      type: NotificationType.TIER_UPGRADED,
      message: `Your listing tier has been adjusted to Tier ${tier} by the Lenda team.`,
    },
  });

  return updated;
}

export async function assignRoles(
  userId: string,
  adminId: string,
  roles: string[],
) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
  });
  if (!user) throw new AppError("User not found", 404);

  const currentRoles = user.roles as string[];
  const hadAdmin = currentRoles.includes("ADMIN");
  const willHaveAdmin = roles.includes("ADMIN");

  if (hadAdmin !== willHaveAdmin) {
    const requestingAdmin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { email: true },
    });
    if (requestingAdmin?.email !== config.MASTER_ADMIN_EMAIL) {
      throw new AppError(
        "Only the master admin can assign or remove the ADMIN role",
        403,
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { roles: { set: roles as any[] } },
    select: { id: true, email: true, roles: true },
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
