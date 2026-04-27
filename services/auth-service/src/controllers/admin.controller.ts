import { Request, Response, NextFunction } from "express";
import { prisma } from "@lenda/database";
import {
  approveKyc,
  rejectKyc,
  awardBadge,
  suspendUser,
  grantPro,
  revokePro,
  adjustListingTier,
  assignRoles,
  getKycDocuments,
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
          photoUrl: true,
          bio: true,
          location: true,
          roles: true,
          kycStatus: true,
          isActive: true,
          subscriptionPlan: true,
          listingTier: true,
          createdAt: true,
          badges: true,
          _count: { select: { kycDocuments: true } },
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

export async function getAdminKycDocumentsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;
    const docs = await getKycDocuments(id);
    res.json({ documents: docs });
  } catch (err) {
    next(err);
  }
}

export async function grantProHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { plan } = req.body;
    if (!["PRO_MONTHLY", "PRO_ANNUAL"].includes(plan)) {
      res
        .status(400)
        .json({ message: "Plan must be PRO_MONTHLY or PRO_ANNUAL" });
      return;
    }
    const user = await grantPro(req.params.id, req.user!.sub, plan);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function revokeProHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await revokePro(req.params.id, req.user!.sub);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function adjustListingTierHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const tier = Number(req.body.tier);
    const user = await adjustListingTier(req.params.id, req.user!.sub, tier);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function assignRolesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { roles } = req.body;
    if (!Array.isArray(roles)) {
      res.status(400).json({ message: "roles must be an array" });
      return;
    }
    const user = await assignRoles(req.params.id, req.user!.sub, roles);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
