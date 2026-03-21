import {
  prisma,
  SubscriptionPlan,
  SubscriptionStatus,
  NotificationType,
} from "@lenda/database";
import { AppError } from "../lib/AppError";

const PLAN_DURATION_DAYS: Record<string, number> = {
  PRO_MONTHLY: 30,
  PRO_ANNUAL: 365,
};

const COMMISSION_RATES: Record<string, number> = {
  FREE: 0.15,
  PRO_MONTHLY: 0.1,
  PRO_ANNUAL: 0.1,
};

const PRO_EXTRA_SLOTS = 3;

export async function upgradeSubscription(
  userId: string,
  plan: "PRO_MONTHLY" | "PRO_ANNUAL",
) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      kycStatus: true,
    },
  });

  if (!user) throw new AppError("User not found", 404);
  if (user.kycStatus !== "APPROVED") {
    throw new AppError("Your account must be verified before subscribing", 403);
  }
  if (user.subscriptionPlan !== SubscriptionPlan.FREE) {
    throw new AppError("You already have an active subscription", 400);
  }

  const durationDays = PLAN_DURATION_DAYS[plan];
  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + durationDays);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionPlan: plan as SubscriptionPlan,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionEndsAt: endsAt,
      commissionRate: COMMISSION_RATES[plan],
      notifications: {
        create: {
          type: NotificationType.TIER_UPGRADED,
          message: `You are now on the ${plan === "PRO_MONTHLY" ? "Pro Monthly" : "Pro Annual"} plan. Your commission rate is now 10% and your listings get boosted visibility.`,
        },
      },
    },
    select: {
      id: true,
      email: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      subscriptionEndsAt: true,
      commissionRate: true,
      listingTier: true,
    },
  });

  return updated;
}

export async function cancelSubscription(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      subscriptionEndsAt: true,
    },
  });

  if (!user) throw new AppError("User not found", 404);
  if (user.subscriptionPlan === SubscriptionPlan.FREE) {
    throw new AppError("You do not have an active subscription", 400);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: SubscriptionStatus.GRACE_PERIOD,
      notifications: {
        create: {
          type: NotificationType.SUBSCRIPTION_EXPIRED,
          message: `Your subscription has been cancelled. You will retain Pro benefits until ${user.subscriptionEndsAt?.toDateString()}. After that your account reverts to the free plan.`,
        },
      },
    },
    select: {
      id: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      subscriptionEndsAt: true,
    },
  });

  return updated;
}

export async function expireSubscription(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      listingTier: true,
      listings: {
        where: {
          deletedAt: null,
          status: { notIn: ["ARCHIVED", "SUSPENDED"] },
        },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!user) throw new AppError("User not found", 404);

  const tierLimit = getTierLimit(user.listingTier);
  const activeListings = user.listings;

  if (activeListings.length > tierLimit) {
    const toSuspend = activeListings.slice(tierLimit);
    await prisma.listing.updateMany({
      where: { id: { in: toSuspend.map((l) => l.id) } },
      data: { status: "SUSPENDED" },
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionPlan: SubscriptionPlan.FREE,
      subscriptionStatus: SubscriptionStatus.EXPIRED,
      subscriptionEndsAt: null,
      commissionRate: COMMISSION_RATES.FREE,
      notifications: {
        create: {
          type: NotificationType.SUBSCRIPTION_EXPIRED,
          message:
            "Your Pro subscription has expired. Your account is now on the free plan.",
        },
      },
    },
  });
}

export async function getSubscriptionStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      subscriptionPlan: true,
      subscriptionStatus: true,
      subscriptionEndsAt: true,
      commissionRate: true,
      listingTier: true,
    },
  });

  if (!user) throw new AppError("User not found", 404);

  const tierLimit = getTierLimit(user.listingTier);
  const isPro = user.subscriptionPlan !== SubscriptionPlan.FREE;
  const effectiveLimit = isPro ? tierLimit + PRO_EXTRA_SLOTS : tierLimit;

  return { ...user, effectiveListingLimit: effectiveLimit };
}

function getTierLimit(tier: number): number {
  const limits: Record<number, number> = { 0: 0, 1: 2, 2: 5, 3: Infinity };
  return limits[tier] ?? 0;
}
