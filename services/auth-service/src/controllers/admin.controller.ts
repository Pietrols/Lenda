import { Request, Response, NextFunction } from "express";
import {
  approveKyc,
  rejectKyc,
  awardBadge,
  suspendUser,
} from "../services/admin.service";

export async function approveKycHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await approveKyc(req.params.id, req.user!.sub);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function rejectKycHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { reason } = req.body;
    const user = await rejectKyc(req.params.id, req.user!.sub, reason);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function awardBadgeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { label } = req.body;
    const badge = await awardBadge(req.params.id, req.user!.sub, label);
    res.json({ badge });
  } catch (err) {
    next(err);
  }
}

export async function suspendUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await suspendUser(req.params.id, req.user!.sub);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
