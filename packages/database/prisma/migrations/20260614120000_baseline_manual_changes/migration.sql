-- Baseline: consolidates all schema changes that were applied to the production
-- database manually via psql after 20260430162144_add_pricing_mode.
--
-- Every statement is idempotent (IF NOT EXISTS / ADD VALUE IF NOT EXISTS / guarded
-- DO blocks) so this baseline is a no-op against the already-migrated production
-- database, yet still produces a correct schema on a fresh database.
--
-- On production this migration is marked as already-applied WITHOUT executing it
-- (see DEPLOYMENT.md):
--   prisma migrate resolve --applied 20260614120000_baseline_manual_changes
--
-- Captured changes:
--   * Category model + CategoryStatus enum
--   * Booking negotiation fields + NEGOTIATION_FAILED on BookingStatus
--   * notifications.referenceId column
--   * NotificationType values (booking-notification set + NEGOTIATION_COUNTER/FAILED)
--   * CommissionLedger model + CommissionStatus enum

-- CreateEnum: CategoryStatus (idempotent)
DO $$ BEGIN
  CREATE TYPE "CategoryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: CommissionStatus (idempotent)
DO $$ BEGIN
  CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterEnum: BookingStatus (idempotent)
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'NEGOTIATION_FAILED';

-- AlterEnum: NotificationType (idempotent)
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOOKING_CREATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOOKING_EN_ROUTE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOOKING_ACTIVE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOOKING_RETURN_PENDING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOOKING_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FIRST_BOOKING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TIP';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEGOTIATION_COUNTER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEGOTIATION_FAILED';

-- AlterTable: bookings negotiation fields (idempotent)
ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "budgetMax" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "budgetMin" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "currentOffer" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "guestCounterCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "hostCounterCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "isNegotiable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "negotiationExpiresAt" TIMESTAMP(3);

-- AlterTable: notifications.referenceId (idempotent)
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "referenceId" TEXT;

-- CreateTable: categories (idempotent)
CREATE TABLE IF NOT EXISTS "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "CategoryStatus" NOT NULL DEFAULT 'APPROVED',
    "suggestedPillars" TEXT[],
    "suggestedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable: commission_ledger (idempotent)
CREATE TABLE IF NOT EXISTS "commission_ledger" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "rate" DECIMAL(5,4) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "commission_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "categories_name_key" ON "categories"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "categories_slug_key" ON "categories"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "commission_ledger_bookingId_key" ON "commission_ledger"("bookingId");

-- AddForeignKey: categories.suggestedById -> users.id (idempotent)
DO $$ BEGIN
  ALTER TABLE "categories"
    ADD CONSTRAINT "categories_suggestedById_fkey"
    FOREIGN KEY ("suggestedById") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
