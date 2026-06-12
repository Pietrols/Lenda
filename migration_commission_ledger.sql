-- Migration: add_commission_ledger
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

CREATE TABLE "commission_ledger" (
  "id"          TEXT              NOT NULL,
  "bookingId"   TEXT              NOT NULL,
  "hostId"      TEXT              NOT NULL,
  "amount"      DECIMAL(10,2)     NOT NULL,
  "rate"        DECIMAL(5,4)      NOT NULL,
  "status"      "CommissionStatus" NOT NULL DEFAULT 'PENDING',
  "attempts"    INTEGER           NOT NULL DEFAULT 0,
  "lastError"   TEXT,
  "createdAt"   TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "commission_ledger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "commission_ledger_bookingId_key" ON "commission_ledger"("bookingId");
