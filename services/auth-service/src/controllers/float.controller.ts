import { Request, Response, NextFunction } from "express";
import {
  setupFloat,
  getFloat,
  requestWithdrawal,
  adminTopUp,
  adminApproveWithdrawal,
  deductCommission,
} from "../services/float.service";

export async function setupFloatHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.sub;
    const float = await setupFloat(userId, req.body);
    res.status(201).json({ float });
  } catch (err) {
    next(err);
  }
}

export async function getFloatHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.sub;
    const float = await getFloat(userId);
    res.json({ float });
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "statusCode" in err &&
      (err as any).statusCode === 404
    ) {
      res.json({ float: null });
      return;
    }
    next(err);
  }
}

export async function requestWithdrawalHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.sub;
    const { amount } = req.body;
    const withdrawal = await requestWithdrawal(userId, Number(amount));
    res.json({ withdrawal });
  } catch (err) {
    next(err);
  }
}

export async function adminTopUpHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;
    const { amount, reference } = req.body;
    const result = await adminTopUp(id, Number(amount), reference);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function adminApproveWithdrawalHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;
    const { reference } = req.body;
    const result = await adminApproveWithdrawal(id, reference);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function deductCommissionHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { hostId, bookingId, bookingAmount, commissionRate } = req.body;
    const result = await deductCommission(
      hostId,
      bookingId,
      bookingAmount,
      commissionRate,
    );
    res.json({ result });
  } catch (err) {
    next(err);
  }
}
