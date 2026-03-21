import { vi } from "vitest";

vi.mock("../lib/mailer", () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));
