// One-time data migration for the free launch period: raise every existing
// KYC-approved user's listingTier to the launch tier (3 = unlimited listings)
// so accounts approved before the default changed are not left behind.
//
// Idempotent: only touches users below the launch tier, so re-running it is
// a no-op. To reverse the launch policy later, lower the starting tier in
// auth-service's approveKyc and let the booking-service tier automation
// (which never demotes) take over; this script itself needs no reversal
// counterpart because earned tiers are recomputed from bookings and reviews.
//
// Run from packages/database: npx tsx scripts/bump-all-hosts-to-launch-tier.ts

import { PrismaClient } from "@prisma/client";

const LAUNCH_LISTING_TIER = 3;

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: {
      kycStatus: "APPROVED",
      listingTier: { lt: LAUNCH_LISTING_TIER },
      deletedAt: null,
    },
    data: { listingTier: LAUNCH_LISTING_TIER },
  });
  console.log(
    `Bumped ${result.count} KYC-approved user(s) to listing tier ${LAUNCH_LISTING_TIER}.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
