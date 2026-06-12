import { Router, IRouter } from "express";
import { authenticate, requireRole } from "../middleware/authenticate";
import { requireInternalKey } from "../middleware/requireInternalKey";
import { Role } from "@lenda/types";
import {
  setupFloatHandler,
  getFloatHandler,
  requestWithdrawalHandler,
  adminTopUpHandler,
  adminApproveWithdrawalHandler,
  adminGetFloatHandler,
} from "../controllers/float.controller";
import { deductCommissionHandler } from "../controllers/float.controller";

const router: IRouter = Router();

router.post("/setup", authenticate, setupFloatHandler);
router.get("/me", authenticate, getFloatHandler);
router.post("/withdraw", authenticate, requestWithdrawalHandler);

router.get(
  "/admin/:id",
  authenticate,
  requireRole(Role.ADMIN),
  adminGetFloatHandler,
);

router.patch(
  "/admin/:id/topup",
  authenticate,
  requireRole(Role.ADMIN),
  adminTopUpHandler,
);
router.patch(
  "/admin/:id/approve-withdrawal",
  authenticate,
  requireRole(Role.ADMIN),
  adminApproveWithdrawalHandler,
);

router.post("/internal/deduct", requireInternalKey, deductCommissionHandler);

export default router;
