import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@lenda/database";
import { sign } from "jsonwebtoken";
import { config } from "../config";

function generateTestToken(userId: string, roles: string[]): string {
  return sign(
    { sub: userId, roles, jti: "test-jti-message", type: "access" },
    config.JWT_ACCESS_SECRET,
    { expiresIn: "1h" },
  );
}

let hostToken: string;
let guestToken: string;
let hostId: string;
let guestId: string;
let bookingId: string;
let messageId: string;

async function cleanupTestData() {
  await prisma.bookingMessage.deleteMany({
    where: {
      booking: { guest: { email: "msgguest@lenda.com" } },
    },
  });
  await prisma.bookingStatusHistory.deleteMany({
    where: { booking: { guest: { email: "msgguest@lenda.com" } } },
  });
  await prisma.booking.deleteMany({
    where: { guest: { email: "msgguest@lenda.com" } },
  });
  await prisma.listing.deleteMany({
    where: { host: { email: "msghost@lenda.com" } },
  });
  await prisma.user.deleteMany({
    where: { email: { in: ["msghost@lenda.com", "msgguest@lenda.com"] } },
  });
}

beforeAll(async () => {
  await cleanupTestData();

  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash("Test1234!", 10);

  const host = await prisma.user.create({
    data: {
      email: "msghost@lenda.com",
      passwordHash: hash,
      roles: ["HOST"] as any,
      emailVerified: true,
      kycStatus: "APPROVED",
      listingTier: 1,
    },
  });

  const guest = await prisma.user.create({
    data: {
      email: "msgguest@lenda.com",
      passwordHash: hash,
      roles: ["GUEST"] as any,
      emailVerified: true,
    },
  });

  hostId = host.id;
  guestId = guest.id;

  const listing = await prisma.listing.create({
    data: {
      hostId,
      title: "Message Test Listing",
      pillar: "RENTAL",
      category: "car",
      pricePerDay: 60,
      currency: "USD",
      location: "Ndola, Zambia",
      status: "ACTIVE",
      metadata: {},
    },
  });

  const booking = await prisma.booking.create({
    data: {
      guestId,
      hostId,
      listingId: listing.id,
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-09-05"),
      totalDays: 4,
      priceSnapshot: 60,
      currency: "USD",
      totalAmount: 240,
      status: "CONFIRMED",
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

describe("POST /bookings/:bookingId/messages", () => {
  it("guest sends a message on their booking", async () => {
    const res = await request(app)
      .post(`/bookings/${bookingId}/messages`)
      .set("Authorization", `Bearer ${guestToken}`)
      .send({ message: "Hi, is the car ready for pickup?" });

    expect(res.status).toBe(201);
    expect(res.body.message.message).toBe("Hi, is the car ready for pickup?");
    expect(res.body.message.senderId).toBe(guestId);
    messageId = res.body.message.id;
  });

  it("host replies to the message", async () => {
    const res = await request(app)
      .post(`/bookings/${bookingId}/messages`)
      .set("Authorization", `Bearer ${hostToken}`)
      .send({ message: "Yes, the car is ready. See you at 9am." });

    expect(res.status).toBe(201);
    expect(res.body.message.senderId).toBe(hostId);
  });

  it("rejects empty message", async () => {
    const res = await request(app)
      .post(`/bookings/${bookingId}/messages`)
      .set("Authorization", `Bearer ${guestToken}`)
      .send({ message: "" });

    expect(res.status).toBe(400);
  });

  it("rejects message from non-party", async () => {
    const bcrypt = await import("bcryptjs");
    const stranger = await prisma.user.create({
      data: {
        email: "msgstranger@lenda.com",
        passwordHash: await bcrypt.hash("Test1234!", 10),
        roles: ["GUEST"] as any,
        emailVerified: true,
      } as any,
    });

    const strangerToken = generateTestToken(stranger.id, ["GUEST"]);

    const res = await request(app)
      .post(`/bookings/${bookingId}/messages`)
      .set("Authorization", `Bearer ${strangerToken}`)
      .send({ message: "I am not part of this booking." });

    expect(res.status).toBe(403);
    await prisma.user.delete({ where: { id: stranger.id } });
  });

  it("rejects unauthenticated request", async () => {
    const res = await request(app)
      .post(`/bookings/${bookingId}/messages`)
      .send({ message: "No auth." });

    expect(res.status).toBe(401);
  });
});

describe("GET /bookings/:bookingId/messages", () => {
  it("returns messages for booking party", async () => {
    const res = await request(app)
      .get(`/bookings/${bookingId}/messages`)
      .set("Authorization", `Bearer ${guestToken}`);

    expect(res.status).toBe(200);
    expect(res.body.messages.length).toBeGreaterThan(0);
    expect(res.body.messages[0].sender).toBeDefined();
  });

  it("marks messages as read when fetched by recipient", async () => {
    const res = await request(app)
      .get(`/bookings/${bookingId}/messages`)
      .set("Authorization", `Bearer ${hostToken}`);

    expect(res.status).toBe(200);
    const guestMessages = res.body.messages.filter(
      (m: { senderId: string; isRead: boolean }) => m.senderId === guestId,
    );
    expect(guestMessages.every((m: { isRead: boolean }) => m.isRead)).toBe(
      true,
    );
  });

  it("rejects access from non-party", async () => {
    const bcrypt = await import("bcryptjs");
    const stranger = await prisma.user.create({
      data: {
        email: "msgnosy@lenda.com",
        passwordHash: await bcrypt.hash("Test1234!", 10),
        roles: ["GUEST"] as any,
        emailVerified: true,
      } as any,
    });

    const strangerToken = generateTestToken(stranger.id, ["GUEST"]);

    const res = await request(app)
      .get(`/bookings/${bookingId}/messages`)
      .set("Authorization", `Bearer ${strangerToken}`);

    expect(res.status).toBe(403);
    await prisma.user.delete({ where: { id: stranger.id } });
  });
});

describe("GET /bookings/:bookingId/messages/unread", () => {
  it("returns unread count for recipient", async () => {
    const res = await request(app)
      .get(`/bookings/${bookingId}/messages/unread`)
      .set("Authorization", `Bearer ${guestToken}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.count).toBe("number");
  });
});
