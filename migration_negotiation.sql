-- Migration: add_negotiation_fields
ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "isNegotiable"         BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "budgetMin"             DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "budgetMax"             DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "currentOffer"          DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "hostCounterCount"      INT          NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "guestCounterCount"     INT          NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "negotiationExpiresAt"  TIMESTAMP(3);
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'NEGOTIATION_FAILED';
