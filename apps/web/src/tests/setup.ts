import "@testing-library/jest-dom";
import { vi } from "vitest";

vi.mock("gsap", () => ({
  default: {
    registerPlugin: vi.fn(),
    fromTo: vi.fn(),
    to: vi.fn(),
    from: vi.fn(),
    timeline: vi.fn(() => ({
      fromTo: vi.fn(),
      to: vi.fn(),
      from: vi.fn(),
    })),
    context: vi.fn(() => ({ revert: vi.fn() })),
  },
  gsap: {
    registerPlugin: vi.fn(),
  },
  ScrollTrigger: vi.fn(),
}));

vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: vi.fn(),
}));
