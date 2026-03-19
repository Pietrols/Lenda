-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "listingTier" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "listingTierSetBy" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "photoUrl" TEXT;
