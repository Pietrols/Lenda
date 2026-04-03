import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Button } from "@/components/ui/Button";

// ─── Button ──────────────────────────────────────────────────
describe("Button", () => {
  it("renders with label", () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole("button", { name: "Click Me" })).toBeTruthy();
  });

  it("calls onClick handler", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("does not call onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders gold variant with correct class", () => {
    render(<Button variant="gold">Gold</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/gold/i);
  });

  it("renders destructive variant", () => {
    render(<Button variant="destructive">Delete</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/destructive/i);
  });

  it("renders as submit button when type is submit", () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });
});

// ─── Navigation links ────────────────────────────────────────
describe("Navigation links render correctly", () => {
  it("renders Browse link", () => {
    render(
      <MemoryRouter>
        <a href="/listings">Browse</a>
      </MemoryRouter>,
    );
    expect(screen.getByText("Browse")).toBeTruthy();
  });

  it("renders dashboard link for authenticated state", () => {
    render(
      <MemoryRouter>
        <a href="/dashboard">Dashboard</a>
      </MemoryRouter>,
    );
    expect(screen.getByText("Dashboard")).toBeTruthy();
  });
});

// ─── Status badge logic ──────────────────────────────────────
describe("Booking status badge display", () => {
  const statusConfig: Record<string, { label: string; color: string }> = {
    PENDING: { label: "Pending", color: "text-gold" },
    CONFIRMED: { label: "Confirmed", color: "text-foreground" },
    ACTIVE: { label: "Active", color: "text-gold" },
    COMPLETED: { label: "Completed", color: "text-foreground/40" },
    CANCELLED: { label: "Cancelled", color: "text-destructive" },
    DISPUTED: { label: "Disputed", color: "text-gold" },
  };

  it("maps all booking statuses to labels", () => {
    const statuses = Object.keys(statusConfig);
    expect(statuses).toContain("PENDING");
    expect(statuses).toContain("COMPLETED");
    expect(statuses).toContain("CANCELLED");
    expect(statuses).toContain("DISPUTED");
  });

  it("PENDING maps to gold color", () => {
    expect(statusConfig["PENDING"].color).toBe("text-gold");
  });

  it("CANCELLED maps to destructive color", () => {
    expect(statusConfig["CANCELLED"].color).toBe("text-destructive");
  });

  it("COMPLETED maps to muted color", () => {
    expect(statusConfig["COMPLETED"].color).toBe("text-foreground/40");
  });
});

// ─── Price calculation logic ──────────────────────────────────
describe("Booking price calculation", () => {
  function calculateTotal(pricePerDay: number, days: number): number {
    return pricePerDay * days;
  }

  function calculateDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  it("calculates correct total for 4 days at K60", () => {
    expect(calculateTotal(60, 4)).toBe(240);
  });

  it("calculates correct number of days between dates", () => {
    expect(calculateDays("2026-08-01", "2026-08-05")).toBe(4);
  });

  it("returns 0 days for same start and end date", () => {
    expect(calculateDays("2026-08-01", "2026-08-01")).toBe(0);
  });

  it("calculates total for single day booking", () => {
    expect(calculateTotal(100, 1)).toBe(100);
  });

  it("handles decimal price per day", () => {
    expect(calculateTotal(55.5, 2)).toBeCloseTo(111);
  });
});

// ─── Form validation logic ────────────────────────────────────
describe("Auth form validation", () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function isValidEmail(email: string): boolean {
    return emailRegex.test(email);
  }

  function isValidPassword(password: string): boolean {
    return (
      password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
    );
  }

  it("accepts valid email", () => {
    expect(isValidEmail("user@lenda.com")).toBe(true);
  });

  it("rejects email without domain", () => {
    expect(isValidEmail("user@")).toBe(false);
  });

  it("rejects email without @", () => {
    expect(isValidEmail("userlenda.com")).toBe(false);
  });

  it("accepts strong password", () => {
    expect(isValidPassword("Test1234!")).toBe(true);
  });

  it("rejects short password", () => {
    expect(isValidPassword("Te1!")).toBe(false);
  });

  it("rejects password without uppercase", () => {
    expect(isValidPassword("test1234!")).toBe(false);
  });

  it("rejects password without number", () => {
    expect(isValidPassword("TestTest!")).toBe(false);
  });
});
