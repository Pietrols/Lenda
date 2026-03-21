import { vi } from "vitest";

vi.mock("../services/discovery.service", () => ({
  recalculateDiscoveryScore: vi.fn().mockResolvedValue(undefined),
  recalculateAllScores: vi.fn().mockResolvedValue(undefined),
}));
