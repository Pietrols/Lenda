import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@lenda/database";
import { sign } from "jsonwebtoken";
import { config } from "../config";

function generateTestToken(userId: string, roles: string[]): string {
  return sign(
    { sub: userId, roles, jti: "test-jti-review", type: "access" },
    config.JWT_ACCESS_SECRET,
    { expiresIn: "1h" },
  );
}

let hostToken: string;
let guestToken: string;
let hostId: string;
let guestId: string;
let listingId: string;
let bookingId: string;
let reviewId: string;

async function cleanupTestData() {
  await prisma.review.deleteMany({
    where: {
      reviewer: {
        email: { in: ["reviewhost@lenda.com", "reviewguest@lenda.com"] },
      },
    },
  });
  await prisma.bookingStatusHistory.deleteMany({
    where: { booking: { guest: { email: "reviewguest@lenda.com" } } },
  });
  await prisma.booking.deleteMany({
    where: { guest: { email: "reviewguest@lenda.com" } },
  });
  await prisma.listing.deleteMany({
    where: { host: { email: "reviewhost@lenda.com" } },
  });
  await prisma.user.deleteMany({
    where: { email: { in: ["reviewhost@lenda.com", "reviewguest@lenda.com"] } },
  });
}

beforeAll(async () => {
  await cleanupTestData();

  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash("Test1234!", 10);

  const host = await prisma.user.create({
    data: {
      email: "reviewhost@lenda.com",
      passwordHash: hash,
      roles: ["HOST"] as any,
      emailVerified: true,
      kycStatus: "APPROVED",
      listingTier: 1,
    },
  });

  const guest = await prisma.user.create({
    data: {
      email: "reviewguest@lenda.com",
      passwordHash: hash,
      roles: ["GUEST"] as any,
      emailVerified: true,
      kycStatus: "APPROVED",
    },
  });

  hostId = host.id;
  guestId = guest.id;

  const listing = await prisma.listing.create({
    data: {
      hostId,
      title: "Review Test Listing",
      pillar: "RENTAL",
      category: "car",
      pricePerDay: 50,
      currency: "USD",
      location: "Lusaka, Zambia",
      status: "ACTIVE",
      metadata: {},
    },
  });

  listingId = listing.id;

  const booking = await prisma.booking.create({
    data: {
      guestId,
      hostId,
      listingId,
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-07-05"),
      totalDays: 4,
      priceSnapshot: 50,
      currency: "USD",
      totalAmount: 200,
      status: "COMPLETED",
      pickupType: "CLIENT_TO_HOST",
    },
  });

  bookingId = booking.id;

  hostToken = generateTestToken(hostId, ["HOST"]);
  guestToken = generateTestToken(guestId, ["GUEST"]);
});

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe("POST /reviews", () => {
  it("guest submits GUEST_TO_HOST review on completed booking", async () => {
    const res = await request(app)
      .post("/reviews")
      .set("Authorization", `Bearer ${guestToken}`)
      .send({
        bookingId,
        rating: 5,
        comment: "Excellent host, car was in perfect condition.",
      });

    expect(res.status).toBe(201);
    expect(res.body.review.type).toBe("GUEST_TO_HOST");
    expect(res.body.review.rating).toBe(5);
    reviewId = res.body.review.id;
  });

  it("host submits HOST_TO_GUEST review on completed booking", async () => {
    const res = await request(app)
      .post("/reviews")
      .set("Authorization", `Bearer ${hostToken}`)
      .send({
        bookingId,
        rating: 4,
        comment: "Great guest, returned the car on time.",
      });

    expect(res.status).toBe(201);
    expect(res.body.review.type).toBe("HOST_TO_GUEST");
    expect(res.body.review.rating).toBe(4);
  });

  it("rejects duplicate review from same user", async () => {
    const res = await request(app)
      .post("/reviews")
      .set("Authorization", `Bearer ${guestToken}`)
      .send({
        bookingId,
        rating: 3,
        comment: "Trying to review again.",
      });

    expect(res.status).toBe(400);
  });

  it("rejects review without auth", async () => {
    const res = await request(app)
      .post("/reviews")
      .send({ bookingId, rating: 5, comment: "No auth review." });

    expect(res.status).toBe(401);
  });

  it("rejects review from non-party", async () => {
    const bcrypt = await import("bcryptjs");
    const stranger = await prisma.user.create({
      data: {
        email: "reviewstranger@lenda.com",
        passwordHash: await bcrypt.hash("Test1234!", 10),
        roles: ["GUEST"] as any,
        emailVerified: true,
      } as any,
    });

    const strangerToken = generateTestToken(stranger.id, ["GUEST"]);

    const res = await request(app)
      .post("/reviews")
      .set("Authorization", `Bearer ${strangerToken}`)
      .send({
        bookingId,
        rating: 1,
        comment: "Trying to review someone else's booking.",
      });

    expect(res.status).toBe(403);
    await prisma.user.delete({ where: { id: stranger.id } });
  });
});

describe("GET /reviews/user/:id", () => {
  it("returns reviews for a user", async () => {
    const res = await request(app)
      .get(`/reviews/user/${hostId}`)
      .set("Authorization", `Bearer ${guestToken}`);

    expect(res.status).toBe(200);
    expect(res.body.reviews.length).toBeGreaterThan(0);
  });

  it("returns empty array for user with no reviews", async () => {
    const bcrypt = await import("bcryptjs");
    const newUser = await prisma.user.create({
      data: {
        email: "noreviews@lenda.com",
        passwordHash: await bcrypt.hash("Test1234!", 10),
        roles: ["GUEST"] as any,
        emailVerified: true,
      } as any,
    });

    const res = await request(app)
      .get(`/reviews/user/${newUser.id}`)
      .set("Authorization", `Bearer ${guestToken}`);

    expect(res.status).toBe(200);
    expect(res.body.reviews).toEqual([]);
    await prisma.user.delete({ where: { id: newUser.id } });
  });
});
