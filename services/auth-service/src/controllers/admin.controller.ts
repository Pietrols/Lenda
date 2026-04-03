import { Request, Response, NextFunction } from "express";
import { prisma } from "@lenda/database";
import {
  approveKyc,
  rejectKyc,
  awardBadge,
  suspendUser,
} from "../services/admin.service";

export async function listUsersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          email: true,
          fullName: true,
          roles: true,
          kycStatus: true,
          isActive: true,
          subscriptionPlan: true,
          listingTier: true,
          createdAt: true,
          badges: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where: { deletedAt: null } }),
    ]);

    res.json({ users, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function kycHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { status, reason } = req.body;
    let user;
    if (status === "APPROVED") {
      user = await approveKyc(req.params.id, req.user!.sub);
    } else {
      user = await rejectKyc(req.params.id, req.user!.sub, reason);
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

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
    // frontend sends { badge }, legacy sends { label }
    const label = req.body.badge ?? req.body.label;
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
    const { suspend } = req.body;
    const user = await suspendUser(req.params.id, req.user!.sub, suspend);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function getUserDetailHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id, deletedAt: null },
      select: {
        id: true,
        email: true,
        fullName: true,
        photoUrl: true,
        bio: true,
        location: true,
        roles: true,
        kycStatus: true,
        isActive: true,
        subscriptionPlan: true,
        listingTier: true,
        commissionRate: true,
        createdAt: true,
        badges: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
}
