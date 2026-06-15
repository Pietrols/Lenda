-- Database-level integrity for bookings and supporting indexes.
-- NOTE: 'NEGOTIATION_FAILED' is used as a raw string literal below because it
-- exists in the DB BookingStatus enum.

-- Required for the exclusion constraint below (GiST over an equality + range).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Prevent two active bookings for the same listing from overlapping in time.
-- The WHERE clause excludes terminal/non-blocking statuses so cancelled,
-- completed, disputed and failed-negotiation bookings never block new ones.
ALTER TABLE "bookings"
  ADD CONSTRAINT "no_overlapping_bookings"
  EXCLUDE USING gist (
    "listingId" WITH =,
    tsrange("startDate", "endDate") WITH &&
  )
  WHERE (
    "status" NOT IN ('CANCELLED', 'COMPLETED', 'DISPUTED', 'NEGOTIATION_FAILED')
  );

-- A booking must end after it starts.
ALTER TABLE "bookings"
  ADD CONSTRAINT "booking_dates_valid"
  CHECK ("endDate" > "startDate");

-- Counter counts are bounded to the 0..2 negotiation rounds the app allows.
ALTER TABLE "bookings"
  ADD CONSTRAINT "host_counter_count_range"
  CHECK ("hostCounterCount" >= 0 AND "hostCounterCount" <= 2);

ALTER TABLE "bookings"
  ADD CONSTRAINT "guest_counter_count_range"
  CHECK ("guestCounterCount" >= 0 AND "guestCounterCount" <= 2);

-- Indexes supporting the hottest query paths.
CREATE INDEX IF NOT EXISTS "bookings_listingId_status_idx"
  ON "bookings" ("listingId", "status");

CREATE INDEX IF NOT EXISTS "bookings_guestId_status_idx"
  ON "bookings" ("guestId", "status");

CREATE INDEX IF NOT EXISTS "bookings_hostId_status_idx"
  ON "bookings" ("hostId", "status");

CREATE INDEX IF NOT EXISTS "bookings_isNegotiable_status_negotiationExpiresAt_idx"
  ON "bookings" ("isNegotiable", "status", "negotiationExpiresAt");

CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_idx"
  ON "notifications" ("userId", "isRead");

CREATE INDEX IF NOT EXISTS "listings_status_category_idx"
  ON "listings" ("status", "category");
