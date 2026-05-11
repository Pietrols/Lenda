-- Migration: add_categories
-- Run this on the server via psql

CREATE TYPE "CategoryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "categories" (
  "id"               UUID          NOT NULL DEFAULT gen_random_uuid(),
  "name"             TEXT          NOT NULL,
  "slug"             TEXT          NOT NULL,
  "status"           "CategoryStatus" NOT NULL DEFAULT 'APPROVED',
  "suggestedPillars" TEXT[]        NOT NULL DEFAULT '{}',
  "suggestedById"    UUID,
  "createdAt"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

ALTER TABLE "categories"
  ADD CONSTRAINT "categories_suggestedById_fkey"
  FOREIGN KEY ("suggestedById")
  REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: initial approved categories
INSERT INTO "categories" ("name", "slug", "status", "suggestedPillars") VALUES
  ('Mechanic',        'mechanic',        'APPROVED', ARRAY['SERVICE','GIGS']),
  ('Driver',          'driver',          'APPROVED', ARRAY['SERVICE','GIGS']),
  ('Logistics',       'logistics',       'APPROVED', ARRAY['SERVICE','GIGS','RENTAL']),
  ('Cleaning',        'cleaning',        'APPROVED', ARRAY['SERVICE','GIGS']),
  ('Plumbing',        'plumbing',        'APPROVED', ARRAY['SERVICE','GIGS']),
  ('Electrical',      'electrical',      'APPROVED', ARRAY['SERVICE','GIGS']),
  ('Painting',        'painting',        'APPROVED', ARRAY['SERVICE','GIGS']),
  ('Security',        'security',        'APPROVED', ARRAY['SERVICE','GIGS','RENTAL']),
  ('Hairstylist',     'hairstylist',     'APPROVED', ARRAY['SERVICE','GIGS']),
  ('Barber',          'barber',          'APPROVED', ARRAY['SERVICE','GIGS']),
  ('Makeup',          'makeup',          'APPROVED', ARRAY['SERVICE','GIGS']),
  ('Nails',           'nails',           'APPROVED', ARRAY['SERVICE','GIGS']),
  ('Tutoring',        'tutoring',        'APPROVED', ARRAY['SERVICE','GIGS']),
  ('Languages',       'languages',       'APPROVED', ARRAY['SERVICE','GIGS']),
  ('Photography',     'photography',     'APPROVED', ARRAY['SERVICE','GIGS','RENTAL']),
  ('Catering',        'catering',        'APPROVED', ARRAY['SERVICE','GIGS']),
  ('DJ',              'dj',              'APPROVED', ARRAY['SERVICE','GIGS']),
  ('Decoration',      'decoration',      'APPROVED', ARRAY['SERVICE','GIGS']),
  ('House Rental',    'house-rental',    'APPROVED', ARRAY['RENTAL']),
  ('Room Rental',     'room-rental',     'APPROVED', ARRAY['RENTAL']),
  ('Office Space',    'office-space',    'APPROVED', ARRAY['RENTAL']),
  ('Tools',           'tools',           'APPROVED', ARRAY['RENTAL']),
  ('Vehicles',        'vehicles',        'APPROVED', ARRAY['RENTAL','SERVICE']),
  ('Electronics',     'electronics',     'APPROVED', ARRAY['RENTAL']),
  ('Delivery',        'delivery',        'APPROVED', ARRAY['SERVICE','GIGS']),
  ('Shopping',        'shopping',        'APPROVED', ARRAY['SERVICE','GIGS']),
  ('Admin Support',   'admin-support',   'APPROVED', ARRAY['SERVICE','GIGS']),
  ('Phone Repair',    'phone-repair',    'APPROVED', ARRAY['SERVICE','GIGS']),
  ('Computer Repair', 'computer-repair', 'APPROVED', ARRAY['SERVICE','GIGS']),
  ('IT Support',      'it-support',      'APPROVED', ARRAY['SERVICE','GIGS']);