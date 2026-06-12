import { prisma, Prisma } from "@lenda/database";
import { config } from "../config";

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 10;

export async function processCommissions() {
  const pending = await prisma.commissionLedger.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  });

  for (const entry of pending) {
    try {
      // The auth endpoint expects the original booking amount and rate,
      // and computes the commission itself.
      const bookingAmount = new Prisma.Decimal(entry.amount)
        .div(entry.rate)
        .toNumber();

      const res = await fetch(`${config.AUTH_URL}/float/internal/deduct`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-key": config.INTERNAL_API_KEY,
        },
        body: JSON.stringify({
          hostId: entry.hostId,
          bookingId: entry.bookingId,
          bookingAmount,
          commissionRate: Number(entry.rate),
        }),
      });

      if (!res.ok) {
        throw new Error(`Auth service responded ${res.status}`);
      }

      await prisma.commissionLedger.update({
        where: { id: entry.id },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
    } catch (err) {
      const attempts = entry.attempts + 1;
      await prisma.commissionLedger.update({
        where: { id: entry.id },
        data: {
          attempts,
          lastError: err instanceof Error ? err.message : String(err),
          status: attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
        },
      });
    }
  }

  return pending.length;
}
