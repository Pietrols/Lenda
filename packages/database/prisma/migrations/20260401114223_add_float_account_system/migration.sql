-- CreateEnum
CREATE TYPE "MobileMoneyProvider" AS ENUM ('AIRTEL', 'MTN', 'ZAMTEL');

-- CreateEnum
CREATE TYPE "FloatTransactionType" AS ENUM ('TOP_UP', 'COMMISSION_DEDUCTION', 'WITHDRAWAL', 'WITHDRAWAL_FEE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "FloatTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED');

-- CreateTable
CREATE TABLE "float_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalEarned" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalDeducted" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalWithdrawn" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bookingCount" INTEGER NOT NULL DEFAULT 0,
    "mobileMoneyProvider" "MobileMoneyProvider" NOT NULL,
    "mobileMoneyNumber" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "float_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "float_transactions" (
    "id" TEXT NOT NULL,
    "floatAccountId" TEXT NOT NULL,
    "type" "FloatTransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balanceBefore" DECIMAL(10,2) NOT NULL,
    "balanceAfter" DECIMAL(10,2) NOT NULL,
    "bookingId" TEXT,
    "reference" TEXT,
    "status" "FloatTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "float_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "float_withdrawals" (
    "id" TEXT NOT NULL,
    "floatAccountId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "fee" DECIMAL(10,2) NOT NULL,
    "netAmount" DECIMAL(10,2) NOT NULL,
    "provider" "MobileMoneyProvider" NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "float_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "float_accounts_userId_key" ON "float_accounts"("userId");

-- AddForeignKey
ALTER TABLE "float_accounts" ADD CONSTRAINT "float_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "float_transactions" ADD CONSTRAINT "float_transactions_floatAccountId_fkey" FOREIGN KEY ("floatAccountId") REFERENCES "float_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "float_withdrawals" ADD CONSTRAINT "float_withdrawals_floatAccountId_fkey" FOREIGN KEY ("floatAccountId") REFERENCES "float_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
