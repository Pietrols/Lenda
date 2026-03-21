import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "@lenda/database";
import { redis } from "../lib/redis";

const app = createApp();

const TEST_USER = {
  email: "testuser@lenda.com",
  password: "Test1234!",
  roles: ["GUEST"],
};

async function cleanupTestUser() {
  await prisma.user.deleteMany({ where: { email: TEST_USER.email } });
  await prisma.user.deleteMany({ where: { email: "unverified@lenda.com" } });
}

async function getOtp(email: string): Promise<string> {
  const raw = await redis.get(`otp:email:${email}`);
  if (!raw) throw new Error("OTP not found in Redis");
  const parsed = JSON.parse(raw);
  return parsed.code;
}

beforeAll(async () => {
  await cleanupTestUser();
});

afterAll(async () => {
  await cleanupTestUser();
  await prisma.$disconnect();
  await redis.quit();
});

describe("POST /auth/register", () => {
  it("registers a new user successfully", async () => {
    const res = await request(app).post("/auth/register").send(TEST_USER);
    expect(res.status).toBe(201);
    expect(res.body.message).toContain("verification code");
  });

  it("rejects duplicate email", async () => {
    const res = await request(app).post("/auth/register").send(TEST_USER);
    expect(res.status).toBe(409);
  });

  it("rejects invalid email", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ ...TEST_USER, email: "notanemail" });
    expect(res.status).toBe(422);
  });

  it("rejects short password", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ ...TEST_USER, email: "other@lenda.com", password: "123" });
    expect(res.status).toBe(422);
  });
});

describe("POST /auth/verify-email", () => {
  it("verifies email with correct OTP", async () => {
    const otp = await getOtp(TEST_USER.email);
    const res = await request(app)
      .post("/auth/verify-email")
      .send({ email: TEST_USER.email, otp });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain("verified");
  });

  it("rejects invalid OTP on unverified email", async () => {
    // Register a fresh user to get a valid OTP key
    await request(app)
      .post("/auth/register")
      .send({
        email: "otptest@lenda.com",
        password: "Test1234!",
        roles: ["GUEST"],
      });

    const res = await request(app)
      .post("/auth/verify-email")
      .send({ email: "otptest@lenda.com", otp: "000000" });
    expect(res.status).toBe(400);

    await prisma.user.deleteMany({ where: { email: "otptest@lenda.com" } });
  });
});

describe("POST /auth/login", () => {
  it("logs in with correct credentials", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: TEST_USER.email, password: TEST_USER.password });
    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.tokens.refreshToken).toBeDefined();
    expect(res.body.user.email).toBe(TEST_USER.email);
  });

  it("rejects wrong password", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: TEST_USER.email, password: "wrongpassword" });
    expect(res.status).toBe(401);
  });

  it("rejects unverified user", async () => {
    await request(app)
      .post("/auth/register")
      .send({
        email: "unverified@lenda.com",
        password: "Test1234!",
        roles: ["GUEST"],
      });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "unverified@lenda.com", password: "Test1234!" });
    expect(res.status).toBe(403);
  });
});

describe("GET /auth/me", () => {
  it("returns user with valid token", async () => {
    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    const token = loginRes.body.tokens.accessToken;

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(TEST_USER.email);
  });

  it("rejects request without token", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("POST /auth/logout", () => {
  it("logs out and invalidates token", async () => {
    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    const { accessToken, refreshToken } = loginRes.body.tokens;

    const logoutRes = await request(app)
      .post("/auth/logout")
      .send({ refreshToken })
      .set("Authorization", `Bearer ${accessToken}`);
    expect(logoutRes.status).toBe(200);

    const meRes = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(meRes.status).toBe(401);
  });
});
