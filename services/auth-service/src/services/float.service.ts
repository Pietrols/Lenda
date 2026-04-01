import { prisma } from "@lenda/database";
import { AppError } from "../lib/AppError";

const COMMISSION_FREE_BOOKINGS = 2;
const MIN_TOP_UP = 50;
const MIN_WITHDRAWAL = 100;
const WITHDRAWAL_FEE_RATE = 0.025;

export async function setupFloat(
  userId: string,
  data: {
    mobileMoneyProvider: "AIRTEL" | "MTN" | "ZAMTEL";
    mobileMoneyNumber: string;
  },
): Promise<any> {
  const existing = await prisma.floatAccount.findUnique({
    where: { userId },
  });
  if (existing) throw new AppError("Float account already exists", 409);

  const float = await prisma.floatAccount.create({
    data: {
      userId,
      mobileMoneyProvider: data.mobileMoneyProvider,
      mobileMoneyNumber: data.mobileMoneyNumber,
    },
  });

  return float;
}

export async function getFloat(userId: string): Promise<any> {
  const float = await prisma.floatAccount.findUnique({
    where: { userId },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      withdrawals: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!float) throw new AppError("Float account not found", 404);
  return float;
}

export async function requestWithdrawal(
  userId: string,
  amount: number,
): Promise<any> {
  const float = await prisma.floatAccount.findUnique({
    where: { userId },
  });

  if (!float) throw new AppError("Float account not found", 404);
  if (!float.isActive) throw new AppError("Float account is inactive", 403);

  if (amount < MIN_WITHDRAWAL) {
    throw new AppError(`Minimum withdrawal is K${MIN_WITHDRAWAL}`, 400);
  }

  const fee = parseFloat((amount * WITHDRAWAL_FEE_RATE).toFixed(2));
  const netAmount = parseFloat((amount - fee).toFixed(2));
  const balanceNum = parseFloat(float.balance.toString());

  if (balanceNum < amount) {
    throw new AppError("Insufficient float balance", 400);
  }

  const [withdrawal] = await prisma.$transaction([
    prisma.floatWithdrawal.create({
      data: {
        floatAccountId: float.id,
        amount,
        fee,
        netAmount,
        provider: float.mobileMoneyProvider,
        mobileNumber: float.mobileMoneyNumber,
        status: "PENDING",
      },
    }),
    prisma.floatAccount.update({
      where: { id: float.id },
      data: {
        balance: { decrement: amount },
        totalWithdrawn: { increment: netAmount },
      },
    }),
    prisma.floatTransaction.create({
      data: {
        floatAccountId: float.id,
        type: "WITHDRAWAL",
        amount,
        balanceBefore: balanceNum,
        balanceAfter: balanceNum - amount,
        status: "PENDING",
        note: `Withdrawal of K${amount} requested. Fee: K${fee}`,
      },
    }),
  ]);

  return withdrawal;
}

export async function adminTopUp(
  floatAccountId: string,
  amount: number,
  reference: string,
) {
  if (amount < MIN_TOP_UP) {
    throw new AppError(`Minimum top-up is K${MIN_TOP_UP}`, 400);
  }

  const float = await prisma.floatAccount.findUnique({
    where: { id: floatAccountId },
  });

  if (!float) throw new AppError("Float account not found", 404);

  const balanceBefore = parseFloat(float.balance.toString());
  const balanceAfter = balanceBefore + amount;

  await prisma.$transaction([
    prisma.floatAccount.update({
      where: { id: floatAccountId },
      data: {
        balance: { increment: amount },
        totalEarned: { increment: amount },
      },
    }),
    prisma.floatTransaction.create({
      data: {
        floatAccountId: float.id,
        type: "TOP_UP",
        amount,
        balanceBefore,
        balanceAfter,
        reference,
        status: "COMPLETED",
        note: `Admin top-up of K${amount}. Reference: ${reference}`,
      },
    }),
  ]);

  return { message: "Top-up applied successfully", newBalance: balanceAfter };
}

export async function adminApproveWithdrawal(
  withdrawalId: string,
  reference: string,
) {
  const withdrawal = await prisma.floatWithdrawal.findUnique({
    where: { id: withdrawalId },
    include: { floatAccount: true },
  });

  if (!withdrawal) throw new AppError("Withdrawal not found", 404);
  if (withdrawal.status !== "PENDING") {
    throw new AppError("Withdrawal is not pending", 400);
  }

  await prisma.$transaction([
    prisma.floatWithdrawal.update({
      where: { id: withdrawalId },
      data: { status: "PROCESSED", reference },
    }),
    prisma.floatTransaction.create({
      data: {
        floatAccountId: withdrawal.floatAccountId,
        type: "WITHDRAWAL_FEE",
        amount: parseFloat(withdrawal.fee.toString()),
        balanceBefore: 0,
        balanceAfter: 0,
        reference,
        status: "COMPLETED",
        note: `Withdrawal fee for withdrawal ${withdrawalId}`,
      },
    }),
  ]);

  return { message: "Withdrawal approved and processed" };
}

export async function deductCommission(
  userId: string,
  bookingId: string,
  bookingAmount: number,
  commissionRate: number,
) {
  const float = await prisma.floatAccount.findUnique({
    where: { userId },
  });

  if (!float) return null;

  if (float.bookingCount < COMMISSION_FREE_BOOKINGS) {
    await prisma.floatAccount.update({
      where: { id: float.id },
      data: { bookingCount: { increment: 1 } },
    });
    return null;
  }

  const commission = parseFloat((bookingAmount * commissionRate).toFixed(2));
  const balanceBefore = parseFloat(float.balance.toString());
  const balanceAfter = balanceBefore - commission;

  await prisma.$transaction([
    prisma.floatAccount.update({
      where: { id: float.id },
      data: {
        balance: { decrement: commission },
        totalDeducted: { increment: commission },
        bookingCount: { increment: 1 },
      },
    }),
    prisma.floatTransaction.create({
      data: {
        floatAccountId: float.id,
        type: "COMMISSION_DEDUCTION",
        amount: commission,
        balanceBefore,
        balanceAfter,
        bookingId,
        status: "COMPLETED",
        note: `Commission deduction of ${commissionRate * 100}% on booking ${bookingId}`,
      },
    }),
  ]);

  if (balanceAfter < 50) {
    await prisma.notification.create({
      data: {
        userId,
        type: "FLOAT_LOW_BALANCE" as any,
        message:
          balanceAfter <= 0
            ? "Your float balance is K0. Top up to continue receiving bookings."
            : `Your float balance is low (K${balanceAfter.toFixed(2)}). Please top up to avoid disruptions.`,
      },
    });
  }

  return { commission, balanceAfter };
}
