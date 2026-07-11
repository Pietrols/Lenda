// Taggable test data for admin screens and manual testing. Every user this
// script creates has an email ending in @lenda.test — the companion
// cleanup-test-data.ts removes everything reachable from that tag, so this
// data never becomes permanent database debris.
//
// Creates hosts and guests, listings across both pillars, and bookings
// spread across the full status lifecycle (PENDING, CONFIRMED, ACTIVE,
// COMPLETED with reviews, CANCELLED, DISPUTED) so admin oversight screens
// have realistic non-happy-path data to show.
//
// Run from packages/database: npx tsx prisma/seed-test-data.ts

import {
  PrismaClient,
  Pillar,
  ListingStatus,
  BookingStatus,
  PickupType,
  ReviewType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TAG = "@lenda.test";

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function main() {
  const passwordHash = await bcrypt.hash("Test1234!", 12);

  const userDefs = [
    {
      email: `seed.host.a${TAG}`,
      fullName: "Seed Host Amara",
      roles: ["HOST", "GUEST"],
      kycStatus: "APPROVED",
      listingTier: 3,
    },
    {
      email: `seed.host.b${TAG}`,
      fullName: "Seed Host Bwalya",
      roles: ["HOST", "GUEST"],
      kycStatus: "PENDING",
      listingTier: 0,
    },
    {
      email: `seed.guest.a${TAG}`,
      fullName: "Seed Guest Chanda",
      roles: ["GUEST"],
      kycStatus: "PENDING",
      listingTier: 0,
    },
    {
      email: `seed.guest.b${TAG}`,
      fullName: "Seed Guest Daliso",
      roles: ["GUEST"],
      kycStatus: "PENDING",
      listingTier: 0,
    },
    {
      email: `seed.guest.c${TAG}`,
      fullName: "Seed Guest Esther",
      roles: ["GUEST"],
      kycStatus: "PENDING",
      listingTier: 0,
    },
  ] as const;

  const users: Record<string, { id: string }> = {};
  for (const def of userDefs) {
    users[def.email] = await prisma.user.upsert({
      where: { email: def.email },
      update: {},
      create: {
        email: def.email,
        passwordHash,
        fullName: def.fullName,
        roles: [...def.roles] as any,
        emailVerified: true,
        kycStatus: def.kycStatus as any,
        listingTier: def.listingTier,
        location: "Lusaka, Zambia",
      },
      select: { id: true },
    });
  }

  const hostA = users[`seed.host.a${TAG}`];
  const guestA = users[`seed.guest.a${TAG}`];
  const guestB = users[`seed.guest.b${TAG}`];
  const guestC = users[`seed.guest.c${TAG}`];

  console.log(`Users ready: ${userDefs.length}`);

  const listingDefs = [
    {
      title: "Seed Test - Canon EOS R6 Camera Kit",
      description:
        "Full-frame mirrorless with two lenses, three batteries, and a carry case.",
      pillar: Pillar.RENTAL,
      category: "electronics",
      pricePerDay: 400,
    },
    {
      title: "Seed Test - Camping Set for 4",
      description:
        "Two tents, sleeping bags, gas stove, and cooler box. Everything for a weekend away.",
      pillar: Pillar.RENTAL,
      category: "outdoors",
      pricePerDay: 250,
    },
    {
      title: "Seed Test - Garden Landscaping Service",
      description:
        "Design, planting, and lawn care by an experienced two-person team.",
      pillar: Pillar.SERVICE,
      category: "gardening",
      pricePerDay: 600,
    },
    {
      title: "Seed Test - Event Catering (up to 50 guests)",
      description:
        "Local and continental menus, staff, and serving equipment included.",
      pillar: Pillar.SERVICE,
      category: "catering",
      pricePerDay: 2500,
    },
    {
      title: "Seed Test - Pressure Washer",
      description: "Heavy-duty 2200W pressure washer with hose and nozzles.",
      pillar: Pillar.RENTAL,
      category: "tools",
      pricePerDay: 150,
    },
    {
      title: "Seed Test - Suspended Example Listing",
      description: "A listing in SUSPENDED status for moderation screens.",
      pillar: Pillar.RENTAL,
      category: "tools",
      pricePerDay: 100,
      status: ListingStatus.SUSPENDED,
    },
  ];

  const listings: { id: string; pricePerDay: number }[] = [];
  for (const def of listingDefs) {
    const listing = await prisma.listing.create({
      data: {
        hostId: hostA.id,
        title: def.title,
        description: def.description,
        pillar: def.pillar,
        category: def.category,
        pricePerDay: def.pricePerDay,
        currency: "ZMW",
        location: "Lusaka, Zambia",
        metadata: { seedTag: TAG },
        status: def.status ?? ListingStatus.ACTIVE,
      },
      select: { id: true },
    });
    listings.push({ id: listing.id, pricePerDay: def.pricePerDay });
    console.log(`Created listing: ${def.title}`);
  }

  // One booking per lifecycle state. Each guest holds at most one
  // non-terminal booking so the data respects the one-active-booking rule
  // the API enforces.
  const bookingDefs = [
    {
      guestId: guestA.id,
      listing: listings[0],
      status: BookingStatus.PENDING,
      start: 7,
      days: 2,
      history: [BookingStatus.PENDING],
    },
    {
      guestId: guestB.id,
      listing: listings[1],
      status: BookingStatus.CONFIRMED,
      start: 10,
      days: 3,
      history: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
    },
    {
      guestId: guestC.id,
      listing: listings[2],
      status: BookingStatus.ACTIVE,
      start: -1,
      days: 3,
      history: [
        BookingStatus.PENDING,
        BookingStatus.CONFIRMED,
        BookingStatus.ACTIVE,
      ],
    },
    {
      guestId: guestA.id,
      listing: listings[3],
      status: BookingStatus.COMPLETED,
      start: -14,
      days: 1,
      history: [
        BookingStatus.PENDING,
        BookingStatus.CONFIRMED,
        BookingStatus.ACTIVE,
        BookingStatus.COMPLETED,
      ],
      review: { rating: 5, comment: "Outstanding food and friendly staff." },
    },
    {
      guestId: guestB.id,
      listing: listings[4],
      status: BookingStatus.COMPLETED,
      start: -7,
      days: 2,
      history: [
        BookingStatus.PENDING,
        BookingStatus.CONFIRMED,
        BookingStatus.ACTIVE,
        BookingStatus.COMPLETED,
      ],
      review: { rating: 3, comment: "Did the job but pickup ran very late." },
    },
    {
      guestId: guestC.id,
      listing: listings[0],
      status: BookingStatus.CANCELLED,
      start: -3,
      days: 2,
      history: [BookingStatus.PENDING, BookingStatus.CANCELLED],
      reason: "Guest cancelled before confirmation",
    },
    {
      guestId: guestB.id,
      listing: listings[2],
      status: BookingStatus.DISPUTED,
      start: -5,
      days: 2,
      history: [
        BookingStatus.PENDING,
        BookingStatus.CONFIRMED,
        BookingStatus.ACTIVE,
        BookingStatus.DISPUTED,
      ],
      reason: "Service not delivered as described - seed dispute example",
    },
  ];

  for (const def of bookingDefs) {
    const startDate = daysFromNow(def.start);
    const endDate = daysFromNow(def.start + def.days);
    const booking = await prisma.booking.create({
      data: {
        guestId: def.guestId,
        hostId: hostA.id,
        listingId: def.listing.id,
        startDate,
        endDate,
        totalDays: def.days,
        priceSnapshot: def.listing.pricePerDay,
        currency: "ZMW",
        totalAmount: def.listing.pricePerDay * def.days,
        status: def.status,
        pickupType: PickupType.CLIENT_TO_HOST,
        notes: `Seed booking (${TAG})`,
        history: {
          create: def.history.map((toStatus, index) => ({
            fromStatus: index === 0 ? null : def.history[index - 1],
            toStatus,
            changedById: index % 2 === 0 ? def.guestId : hostA.id,
            reason:
              toStatus === def.status && def.reason ? def.reason : undefined,
          })),
        },
      },
      select: { id: true },
    });

    if (def.review) {
      await prisma.review.create({
        data: {
          bookingId: booking.id,
          reviewerId: def.guestId,
          revieweeId: hostA.id,
          type: ReviewType.GUEST_TO_HOST,
          rating: def.review.rating,
          comment: def.review.comment,
        },
      });
    }

    console.log(`Created ${def.status} booking ${booking.id}`);
  }

  console.log(
    `\nSeed complete: ${userDefs.length} users, ${listingDefs.length} listings, ${bookingDefs.length} bookings. Tag: ${TAG}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
