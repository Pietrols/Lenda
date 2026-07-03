import { PrismaClient, Pillar, ListingStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Test1234!", 12);

  // Create 3 verified hosts if they don't already exist
  const hostEmails = [
    "host1.seed@lenda.work",
    "host2.seed@lenda.work",
    "host3.seed@lenda.work",
  ];

  const hosts = [];
  for (const email of hostEmails) {
    const host = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash,
        roles: ["HOST", "GUEST"],
        emailVerified: true,
        kycStatus: "APPROVED",
        listingTier: 3,
        fullName: email.split(".")[0].replace("host", "Host "),
        location: "Lusaka, Zambia",
      },
    });
    hosts.push(host);
  }

  const listingsData = [
    {
      hostIndex: 0,
      title: "Toyota Hilux Double Cab 2021",
      description:
        "Reliable 4x4 pickup, well maintained, perfect for Copperbelt roads and weekend trips.",
      pillar: Pillar.RENTAL,
      category: "car",
      subcategory: "pickup",
      pricePerDay: 450,
      currency: "ZMW",
      location: "Ndola, Copperbelt",
      metadata: { seats: 5, transmission: "manual", fuelType: "diesel" },
      images: ["https://images.unsplash.com/photo-1533473359331-0135ef1b58bf"],
    },
    {
      hostIndex: 0,
      title: "3-Bedroom House in Kabulonga",
      description:
        "Spacious family home with garden, secure parking, and 24/7 backup power.",
      pillar: Pillar.RENTAL,
      category: "property",
      subcategory: "house",
      pricePerDay: 800,
      currency: "ZMW",
      location: "Lusaka, Kabulonga",
      metadata: {
        bedrooms: 3,
        bathrooms: 2,
        hasPool: false,
        hasGenerator: true,
      },
      images: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9"],
    },
    {
      hostIndex: 1,
      title: "Professional Wedding Photography",
      description:
        "Full-day wedding coverage including edited digital gallery, delivered within 2 weeks.",
      pillar: Pillar.SERVICE,
      category: "photography",
      subcategory: "wedding",
      pricePerDay: 3500,
      currency: "ZMW",
      location: "Lusaka",
      metadata: { deliveryDays: 14, includesPrints: false },
      images: ["https://images.unsplash.com/photo-1519741497674-611481863552"],
    },
    {
      hostIndex: 1,
      title: "DJ & Sound System for Events",
      description:
        "Full PA system, professional DJ, lighting rig. Weddings, corporate events, parties.",
      pillar: Pillar.SERVICE,
      category: "entertainment",
      subcategory: "dj",
      pricePerDay: 1800,
      currency: "ZMW",
      location: "Ndola, Copperbelt",
      metadata: { hoursIncluded: 6, includesLighting: true },
      images: ["https://images.unsplash.com/photo-1571266028243-d220c9c3b31c"],
    },
    {
      hostIndex: 2,
      title: "Honda Fit 2019 - Fuel Efficient",
      description:
        "Compact, economical, great for city driving. Low mileage, full service history.",
      pillar: Pillar.RENTAL,
      category: "car",
      subcategory: "hatchback",
      pricePerDay: 280,
      currency: "ZMW",
      location: "Lusaka, Woodlands",
      metadata: { seats: 5, transmission: "automatic", fuelType: "petrol" },
      images: ["https://images.unsplash.com/photo-1541899481282-d53bffe3c35d"],
    },
    {
      hostIndex: 2,
      title: "Home Cleaning Service",
      description:
        "Deep cleaning for homes and offices. Own equipment and eco-friendly supplies.",
      pillar: Pillar.SERVICE,
      category: "cleaning",
      subcategory: "residential",
      pricePerDay: 350,
      currency: "ZMW",
      location: "Lusaka",
      metadata: { teamSize: 2, suppliesIncluded: true },
      images: ["https://images.unsplash.com/photo-1581578731548-c64695cc6952"],
    },
  ];

  for (const item of listingsData) {
    const listing = await prisma.listing.create({
      data: {
        hostId: hosts[item.hostIndex].id,
        title: item.title,
        description: item.description,
        pillar: item.pillar,
        category: item.category,
        subcategory: item.subcategory,
        pricePerDay: item.pricePerDay,
        currency: item.currency,
        location: item.location,
        metadata: item.metadata,
        status: ListingStatus.ACTIVE,
      },
    });

    await prisma.listingImage.create({
      data: {
        listingId: listing.id,
        url: `${item.images[0]}?w=800&q=80`,
        altText: item.title,
        isPrimary: true,
        order: 0,
      },
    });

    console.log(`Created listing: ${item.title}`);
  }

  console.log(
    `\nSeed complete: ${hosts.length} hosts, ${listingsData.length} listings`,
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
