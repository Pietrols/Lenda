import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@lenda/database";
import { sign } from "jsonwebtoken";
import { config } from "../config";

function generateTestToken(userId: string, roles: string[]): string {
  return sign(
    { sub: userId, roles, jti: "test-jti", type: "access" },
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

async function cleanupTestData() {
  await prisma.notification.deleteMany({
    where: {
      user: {
        email: { in: ["bookinghost@lenda.com", "bookingguest@lenda.com"] },
      },
    },
  });
  await prisma.bookingStatusHistory.deleteMany({
    where: { booking: { guest: { email: "bookingguest@lenda.com" } } },
  });
  await prisma.booking.deleteMany({
    where: { guest: { email: "bookingguest@lenda.com" } },
  });
  await prisma.listing.deleteMany({
    where: { host: { email: "bookinghost@lenda.com" } },
  });
  await prisma.user.deleteMany({
    where: {
      email: {
        // Include the auxiliary users created inside individual tests so a
        // previously-crashed run can't leave stale rows that trip the unique
        // email constraint on the next run.
        in: [
          "bookinghost@lenda.com",
          "bookingguest@lenda.com",
          "overlap@lenda.com",
          "stranger@lenda.com",
          "nosey@lenda.com",
        ],
      },
    },
  });
}

beforeAll(async () => {
  await cleanupTestData();

  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash("Test1234!", 10);

  const host = await prisma.user.create({
    data: {
      email: "bookinghost@lenda.com",
      passwordHash: hash,
      roles: ["HOST"] as any,
      emailVerified: true,
      kycStatus: "APPROVED",
      listingTier: 1,
    },
  });

  const guest = await prisma.user.create({
    data: {
      email: "bookingguest@lenda.com",
      passwordHash: hash,
      roles: ["GUEST"] as any,
      emailVerified: true,
      kycStatus: "PENDING",
    },
  });

  hostId = host.id;
  guestId = guest.id;

  const listing = await prisma.listing.create({
    data: {
      hostId,
      title: "Booking Test Car",
      description: "A car for booking tests",
      pillar: "RENTAL",
      category: "car",
      pricePerDay: 50,
      currency: "USD",
      location: "Kitwe, Zambia",
      status: "ACTIVE",
      metadata: {},
    },
  });

  listingId = listing.id;

  hostToken = generateTestToken(hostId, ["HOST"]);
  guestToken = generateTestToken(guestId, ["GUEST"]);
});

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe("POST /bookings", () => {
  it("creates a booking as GUEST", async () => {
    const res = await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${guestToken}`)
      .send({
        listingId,
        startDate: "2026-08-01T08:00:00.000Z",
        endDate: "2026-08-05T08:00:00.000Z",
        pickupType: "CLIENT_TO_HOST",
        notes: "Test booking",
      });

    expect(res.status).toBe(201);
    expect(res.body.booking.status).toBe("PENDING");
    expect(res.body.booking.totalDays).toBe(4);
    expect(res.body.booking.totalAmount).toBe("200");
    bookingId = res.body.booking.id;
  });

  it("rejects booking own listing", async () => {
    const res = await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${hostToken}`)
      .send({
        listingId,
        startDate: "2026-09-01T08:00:00.000Z",
        endDate: "2026-09-05T08:00:00.000Z",
        pickupType: "CLIENT_TO_HOST",
      });

    expect(res.status).toBe(403);
  });

  it("rejects overlapping booking", async () => {
    const bcrypt = await import("bcryptjs");
    const anotherGuest = await prisma.user.create({
      data: {
        email: "overlap@lenda.com",
        passwordHash: await bcrypt.hash("Test1234!", 10),
        roles: ["GUEST"] as any,
        emailVerified: true,
      } as any,
    });

    const overlapToken = generateTestToken(anotherGuest.id, ["GUEST"]);

    const res = await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${overlapToken}`)
      .send({
        listingId,
        startDate: "2026-08-02T08:00:00.000Z",
        endDate: "2026-08-04T08:00:00.000Z",
        pickupType: "CLIENT_TO_HOST",
      });

    expect(res.status).toBe(409);
    await prisma.user.delete({ where: { id: anotherGuest.id } });
  });

  it("rejects booking with end date before start date", async () => {
    const res = await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${guestToken}`)
      .send({
        listingId,
        startDate: "2026-10-05T08:00:00.000Z",
        endDate: "2026-10-01T08:00:00.000Z",
        pickupType: "CLIENT_TO_HOST",
      });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /bookings/:id/status", () => {
  it("host confirms booking", async () => {
    const res = await request(app)
      .patch(`/bookings/${bookingId}/status`)
      .set("Authorization", `Bearer ${hostToken}`)
      .send({ status: "CONFIRMED", reason: "Looks good" });

    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe("CONFIRMED");
  });

  it("rejects invalid transition", async () => {
    const res = await request(app)
      .patch(`/bookings/${bookingId}/status`)
      .set("Authorization", `Bearer ${hostToken}`)
      .send({ status: "PENDING" });

    expect(res.status).toBe(400);
  });

  it("rejects transition by non-party", async () => {
    const bcrypt = await import("bcryptjs");
    const stranger = await prisma.user.create({
      data: {
        email: "stranger@lenda.com",
        passwordHash: await bcrypt.hash("Test1234!", 10),
        roles: ["HOST"] as any,
        emailVerified: true,
        kycStatus: "APPROVED",
        listingTier: 1,
      } as any,
    });

    const strangerToken = generateTestToken(stranger.id, ["HOST"]);

    const res = await request(app)
      .patch(`/bookings/${bookingId}/status`)
      .set("Authorization", `Bearer ${strangerToken}`)
      .send({ status: "CANCELLED" });

    expect(res.status).toBe(403);
    await prisma.user.delete({ where: { id: stranger.id } });
  });
});

describe("GET /bookings", () => {
  it("returns guest bookings for guest user", async () => {
    const res = await request(app)
      .get("/bookings")
      .set("Authorization", `Bearer ${guestToken}`);

    expect(res.status).toBe(200);
    expect(res.body.bookings.length).toBeGreaterThan(0);
    expect(res.body.bookings.every((b: any) => b.guestId === guestId)).toBe(
      true,
    );
  });

  it("returns host bookings for host user", async () => {
    const res = await request(app)
      .get("/bookings")
      .set("Authorization", `Bearer ${hostToken}`);

    expect(res.status).toBe(200);
    expect(res.body.bookings.every((b: any) => b.hostId === hostId)).toBe(true);
  });

  it("rejects unauthenticated request", async () => {
    const res = await request(app).get("/bookings");
    expect(res.status).toBe(401);
  });
});

describe("GET /bookings/:id", () => {
  it("returns booking with full history", async () => {
    const res = await request(app)
      .get(`/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${guestToken}`);

    expect(res.status).toBe(200);
    expect(res.body.booking.history.length).toBeGreaterThan(0);
    expect(res.body.booking.listing).toBeDefined();
  });

  it("rejects access from non-party", async () => {
    const bcrypt = await import("bcryptjs");
    const stranger = await prisma.user.create({
      data: {
        email: "nosey@lenda.com",
        passwordHash: await bcrypt.hash("Test1234!", 10),
        roles: ["GUEST"] as any,
        emailVerified: true,
      } as any,
    });

    const strangerToken = generateTestToken(stranger.id, ["GUEST"]);

    const res = await request(app)
      .get(`/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${strangerToken}`);

    expect(res.status).toBe(403);
    await prisma.user.delete({ where: { id: stranger.id } });
  });
});
