// Removes every trace of the @lenda.test tagged test data: the users, their
// listings, and every booking they were party to, along with all dependent
// rows (messages, handovers, history, reviews, commissions, likes,
// notifications, device tokens, KYC documents, portfolio images, float
// accounts). Deletion order respects foreign keys, so this runs cleanly on
// a live database.
//
// Also covers bookings where a tagged user booked a NON-tagged host's
// listing (or vice versa) — anything touching a tagged account goes.
//
// Run from packages/database: npx tsx prisma/cleanup-test-data.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TAG = "@lenda.test";

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { endsWith: TAG } },
    select: { id: true, email: true },
  });

  if (users.length === 0) {
    console.log(`No users tagged ${TAG} found - nothing to clean up.`);
    return;
  }

  const userIds = users.map((u) => u.id);

  const listings = await prisma.listing.findMany({
    where: { hostId: { in: userIds } },
    select: { id: true },
  });
  const listingIds = listings.map((l) => l.id);

  const bookings = await prisma.booking.findMany({
    where: {
      OR: [
        { guestId: { in: userIds } },
        { hostId: { in: userIds } },
        { listingId: { in: listingIds } },
      ],
    },
    select: { id: true },
  });
  const bookingIds = bookings.map((b) => b.id);

  console.log(
    `Found ${users.length} users, ${listingIds.length} listings, ${bookingIds.length} bookings tagged ${TAG}.`,
  );

  const del = async (label: string, fn: () => Promise<{ count: number }>) => {
    const { count } = await fn();
    if (count > 0) console.log(`Deleted ${count} ${label}`);
  };

  await del("booking messages", () =>
    prisma.bookingMessage.deleteMany({
      where: {
        OR: [{ bookingId: { in: bookingIds } }, { senderId: { in: userIds } }],
      },
    }),
  );
  await del("handovers", () =>
    prisma.handover.deleteMany({ where: { bookingId: { in: bookingIds } } }),
  );
  await del("status history entries", () =>
    prisma.bookingStatusHistory.deleteMany({
      where: {
        OR: [{ bookingId: { in: bookingIds } }, { changedById: { in: userIds } }],
      },
    }),
  );
  await del("reviews", () =>
    prisma.review.deleteMany({
      where: {
        OR: [
          { bookingId: { in: bookingIds } },
          { reviewerId: { in: userIds } },
          { revieweeId: { in: userIds } },
        ],
      },
    }),
  );
  await del("commission ledger entries", () =>
    prisma.commissionLedger.deleteMany({
      where: {
        OR: [{ bookingId: { in: bookingIds } }, { hostId: { in: userIds } }],
      },
    }),
  );
  await del("bookings", () =>
    prisma.booking.deleteMany({ where: { id: { in: bookingIds } } }),
  );
  await del("likes", () =>
    prisma.like.deleteMany({
      where: {
        OR: [{ userId: { in: userIds } }, { listingId: { in: listingIds } }],
      },
    }),
  );
  await del("listing images", () =>
    prisma.listingImage.deleteMany({
      where: { listingId: { in: listingIds } },
    }),
  );
  await del("listings", () =>
    prisma.listing.deleteMany({ where: { id: { in: listingIds } } }),
  );
  await del("float transactions", () =>
    prisma.floatTransaction.deleteMany({
      where: { floatAccount: { userId: { in: userIds } } },
    }),
  );
  await del("float withdrawals", () =>
    prisma.floatWithdrawal.deleteMany({
      where: { floatAccount: { userId: { in: userIds } } },
    }),
  );
  await del("float accounts", () =>
    prisma.floatAccount.deleteMany({ where: { userId: { in: userIds } } }),
  );
  await del("notifications", () =>
    prisma.notification.deleteMany({ where: { userId: { in: userIds } } }),
  );
  await del("device tokens", () =>
    prisma.deviceToken.deleteMany({ where: { userId: { in: userIds } } }),
  );
  await del("KYC documents", () =>
    prisma.kycDocument.deleteMany({ where: { userId: { in: userIds } } }),
  );
  await del("portfolio images", () =>
    prisma.portfolioImage.deleteMany({ where: { userId: { in: userIds } } }),
  );
  await del("users", () =>
    prisma.user.deleteMany({ where: { id: { in: userIds } } }),
  );

  console.log(`\nCleanup complete for tag ${TAG}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
