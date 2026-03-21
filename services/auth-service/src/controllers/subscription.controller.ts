import { Request, Response, NextFunction } from "express";
import {
  upgradeSubscription,
  cancelSubscription,
  getSubscriptionStatus,
} from "../services/subscription.service";

export async function upgradeSubscriptionHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.sub;
    const { plan } = req.body;
    const result = await upgradeSubscription(userId, plan);
    res.json({ subscription: result });
  } catch (err) {
    next(err);
  }
}

export async function cancelSubscriptionHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.sub;
    const result = await cancelSubscription(userId);
    res.json({ subscription: result });
  } catch (err) {
    next(err);
  }
}

export async function getSubscriptionStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.sub;
    const result = await getSubscriptionStatus(userId);
    res.json({ subscription: result });
  } catch (err) {
    next(err);
  }
}
