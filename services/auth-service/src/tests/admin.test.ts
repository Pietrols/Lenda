import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "@lenda/database";
import { redis } from "../lib/redis";
import { sign } from "jsonwebtoken";
import { config } from "../config";

const app = createApp();

function generateAdminToken(userId: string): string {
  return sign(
    { sub: userId, roles: ["ADMIN"], jti: "test-jti-admin", type: "access" },
    config.JWT_ACCESS_SECRET,
    { expiresIn: "1h" },
  );
}

function generateGuestToken(userId: string): string {
  return sign(
    {
      sub: userId,
      roles: ["GUEST"],
      jti: "test-jti-guest-admin",
      type: "access",
    },
    config.JWT_ACCESS_SECRET,
    { expiresIn: "1h" },
  );
}

let adminToken: string;
let guestToken: string;
let adminId: string;
let targetUserId: string;

async function cleanupTestData() {
  await prisma.notification.deleteMany({
    where: {
      user: {
        email: { in: ["admintestuser@lenda.com", "admintarget@lenda.com"] },
      },
    },
  });
  await prisma.badge.deleteMany({
    where: {
      user: {
        email: { in: ["admintestuser@lenda.com", "admintarget@lenda.com"] },
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      email: { in: ["admintestuser@lenda.com", "admintarget@lenda.com"] },
    },
  });
}

beforeAll(async () => {
  await cleanupTestData();

  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash("Test1234!", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admintestuser@lenda.com",
      passwordHash: hash,
      roles: ["ADMIN"] as any,
      emailVerified: true,
      kycStatus: "APPROVED",
      isActive: true,
    },
  });

  const target = await prisma.user.create({
    data: {
      email: "admintarget@lenda.com",
      passwordHash: hash,
      roles: ["GUEST"] as any,
      emailVerified: true,
      kycStatus: "PENDING",
      isActive: true,
    },
  });

  adminId = admin.id;
  targetUserId = target.id;

  adminToken = generateAdminToken(adminId);
  guestToken = generateGuestToken(targetUserId);
});

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
  await redis.quit();
});

describe("GET /admin/users", () => {
  it("returns paginated user list for admin", async () => {
    const res = await request(app)
      .get("/admin/users")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(typeof res.body.total).toBe("number");
    expect(res.body.total).toBeGreaterThan(0);
  });

  it("rejects non-admin access", async () => {
    const res = await request(app)
      .get("/admin/users")
      .set("Authorization", `Bearer ${guestToken}`);

    expect(res.status).toBe(403);
  });

  it("rejects unauthenticated access", async () => {
    const res = await request(app).get("/admin/users");
    expect(res.status).toBe(401);
  });

  it("supports pagination", async () => {
    const res = await request(app)
      .get("/admin/users?page=1&limit=2")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.users.length).toBeLessThanOrEqual(2);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(2);
  });
});

describe("GET /admin/users/:id", () => {
  it("returns full user detail for admin", async () => {
    const res = await request(app)
      .get(`/admin/users/${targetUserId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(targetUserId);
    expect(res.body.user.email).toBe("admintarget@lenda.com");
    expect(res.body.user.roles).toBeDefined();
    expect(res.body.user.kycStatus).toBeDefined();
  });

  it("returns 404 for non-existent user", async () => {
    const res = await request(app)
      .get("/admin/users/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("rejects non-admin access", async () => {
    const res = await request(app)
      .get(`/admin/users/${targetUserId}`)
      .set("Authorization", `Bearer ${guestToken}`);

    expect(res.status).toBe(403);
  });
});

describe("PATCH /admin/users/:id/kyc", () => {
  it("admin approves KYC", async () => {
    const res = await request(app)
      .patch(`/admin/users/${targetUserId}/kyc`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "APPROVED" });

    expect(res.status).toBe(200);
    expect(res.body.user.kycStatus).toBe("APPROVED");
  });

  it("rejects double approval", async () => {
    const res = await request(app)
      .patch(`/admin/users/${targetUserId}/kyc`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "APPROVED" });

    expect(res.status).toBe(400);
  });

  it("rejects non-admin access", async () => {
    const res = await request(app)
      .patch(`/admin/users/${targetUserId}/kyc`)
      .set("Authorization", `Bearer ${guestToken}`)
      .send({ status: "APPROVED" });

    expect(res.status).toBe(403);
  });
});

describe("POST /admin/users/:id/badge", () => {
  it("admin awards a badge", async () => {
    const res = await request(app)
      .post(`/admin/users/${targetUserId}/badge`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ badge: "Top Guest" });

    expect(res.status).toBe(200);
    expect(res.body.badge.label).toBe("Top Guest");
  });

  it("rejects badge without label", async () => {
    const res = await request(app)
      .post(`/admin/users/${targetUserId}/badge`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ badge: "" });

    expect(res.status).toBe(400);
  });

  it("rejects non-admin access", async () => {
    const res = await request(app)
      .post(`/admin/users/${targetUserId}/badge`)
      .set("Authorization", `Bearer ${guestToken}`)
      .send({ badge: "Sneaky Badge" });

    expect(res.status).toBe(403);
  });
});

describe("PATCH /admin/users/:id/suspend", () => {
  it("admin suspends a user", async () => {
    const res = await request(app)
      .patch(`/admin/users/${targetUserId}/suspend`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ suspend: true });

    expect(res.status).toBe(200);
    expect(res.body.user.isActive).toBe(false);
  });

  it("admin unsuspends a user", async () => {
    const res = await request(app)
      .patch(`/admin/users/${targetUserId}/suspend`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ suspend: false });

    expect(res.status).toBe(200);
    expect(res.body.user.isActive).toBe(true);
  });

  it("rejects suspending already suspended user", async () => {
    await request(app)
      .patch(`/admin/users/${targetUserId}/suspend`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ suspend: true });

    const res = await request(app)
      .patch(`/admin/users/${targetUserId}/suspend`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ suspend: true });

    expect(res.status).toBe(400);

    await request(app)
      .patch(`/admin/users/${targetUserId}/suspend`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ suspend: false });
  });

  it("rejects non-admin access", async () => {
    const res = await request(app)
      .patch(`/admin/users/${targetUserId}/suspend`)
      .set("Authorization", `Bearer ${guestToken}`)
      .send({ suspend: true });

    expect(res.status).toBe(403);
  });
});
