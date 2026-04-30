-- CreateEnum
CREATE TYPE "PricingMode" AS ENUM ('FIXED', 'HOURLY', 'NEGOTIABLE');

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "pricingMode" "PricingMode" NOT NULL DEFAULT 'FIXED';
