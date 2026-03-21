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

async function cleanupTestData() {
  await prisma.listing.deleteMany({
    where: {
      host: {
        email: { in: ["listinghost@lenda.com", "listingguest@lenda.com"] },
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      email: { in: ["listinghost@lenda.com", "listingguest@lenda.com"] },
    },
  });
}

beforeAll(async () => {
  await cleanupTestData();

  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash("Test1234!", 10);

  const host = await prisma.user.create({
    data: {
      email: "listinghost@lenda.com",
      passwordHash: hash,
      roles: ["HOST"] as any,
      emailVerified: true,
      kycStatus: "APPROVED",
      listingTier: 1,
    },
  });

  const guest = await prisma.user.create({
    data: {
      email: "listingguest@lenda.com",
      passwordHash: hash,
      roles: ["GUEST"] as any,
      emailVerified: true,
      kycStatus: "PENDING",
      listingTier: 0,
    },
  });

  hostId = host.id;
  guestId = guest.id;

  hostToken = generateTestToken(hostId, ["HOST"]);
  guestToken = generateTestToken(guestId, ["GUEST"]);
});

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe("POST /listings", () => {
  it("creates a listing as verified HOST", async () => {
    const res = await request(app)
      .post("/listings")
      .set("Authorization", `Bearer ${hostToken}`)
      .send({
        title: "Test Car Listing",
        description: "A reliable test vehicle for hire",
        pillar: "RENTAL",
        category: "car",
        pricePerDay: 50,
        currency: "USD",
        location: "Kitwe, Zambia",
      });

    expect(res.status).toBe(201);
    expect(res.body.listing.title).toBe("Test Car Listing");
    expect(res.body.listing.status).toBe("DRAFT");
    listingId = res.body.listing.id;
  });

  it("rejects listing creation as GUEST", async () => {
    const res = await request(app)
      .post("/listings")
      .set("Authorization", `Bearer ${guestToken}`)
      .send({
        title: "Guest Listing Attempt",
        description: "This should not work at all",
        pillar: "RENTAL",
        category: "car",
        pricePerDay: 50,
        currency: "USD",
        location: "Kitwe, Zambia",
      });

    expect(res.status).toBe(403);
  });

  it("rejects listing without auth", async () => {
    const res = await request(app).post("/listings").send({
      title: "No Auth Listing",
      description: "This should not work at all",
      pillar: "RENTAL",
      category: "car",
      pricePerDay: 50,
      currency: "USD",
      location: "Kitwe, Zambia",
    });

    expect(res.status).toBe(401);
  });

  it("rejects listing with missing required fields", async () => {
    const res = await request(app)
      .post("/listings")
      .set("Authorization", `Bearer ${hostToken}`)
      .send({ title: "Incomplete" });

    expect(res.status).toBe(400);
  });
});

describe("GET /listings", () => {
  it("returns paginated listings publicly", async () => {
    await prisma.listing.updateMany({
      where: { id: listingId },
      data: { status: "ACTIVE" },
    });

    const res = await request(app).get("/listings");

    expect(res.status).toBe(200);
    expect(res.body.listings).toBeDefined();
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThan(0);
  });

  it("filters listings by category", async () => {
    const res = await request(app).get("/listings?category=car");

    expect(res.status).toBe(200);
    expect(res.body.listings.every((l: any) => l.category === "car")).toBe(
      true,
    );
  });

  it("filters listings by pillar", async () => {
    const res = await request(app).get("/listings?pillar=RENTAL");

    expect(res.status).toBe(200);
    expect(res.body.listings.every((l: any) => l.pillar === "RENTAL")).toBe(
      true,
    );
  });
});

describe("GET /listings/:id", () => {
  it("returns a single listing with host info", async () => {
    const res = await request(app).get(`/listings/${listingId}`);

    expect(res.status).toBe(200);
    expect(res.body.listing.id).toBe(listingId);
    expect(res.body.listing.host).toBeDefined();
  });

  it("returns 404 for non-existent listing", async () => {
    const res = await request(app).get(
      "/listings/00000000-0000-0000-0000-000000000000",
    );

    expect(res.status).toBe(404);
  });
});

describe("PATCH /listings/:id", () => {
  it("updates a listing as the owner", async () => {
    const res = await request(app)
      .patch(`/listings/${listingId}`)
      .set("Authorization", `Bearer ${hostToken}`)
      .send({ title: "Updated Test Car", pricePerDay: 75 });

    expect(res.status).toBe(200);
    expect(res.body.listing.title).toBe("Updated Test Car");
    expect(res.body.listing.pricePerDay).toBe("75");
  });

  it("rejects update from non-owner", async () => {
    const res = await request(app)
      .patch(`/listings/${listingId}`)
      .set("Authorization", `Bearer ${guestToken}`)
      .send({ title: "Hijacked Title" });

    expect(res.status).toBe(403);
  });
});

describe("DELETE /listings/:id", () => {
  it("soft deletes a listing as the owner", async () => {
    const res = await request(app)
      .delete(`/listings/${listingId}`)
      .set("Authorization", `Bearer ${hostToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("deleted");

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });
    expect(listing?.deletedAt).not.toBeNull();
    expect(listing?.status).toBe("ARCHIVED");
  });
});
