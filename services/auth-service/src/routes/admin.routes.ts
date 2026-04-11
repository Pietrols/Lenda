import { Router, IRouter } from "express";
import { authenticate, requireRole } from "../middleware/authenticate";
import {
  listUsersHandler,
  kycHandler,
  approveKycHandler,
  rejectKycHandler,
  awardBadgeHandler,
  suspendUserHandler,
  getAdminKycDocumentsHandler,
} from "../controllers/admin.controller";
import { Role } from "@lenda/types";
import { getUserDetailHandler } from "../controllers/admin.controller";

const router: IRouter = Router();

router.use(authenticate, requireRole(Role.ADMIN));

// List all users
router.get("/users", listUsersHandler);

// KYC — unified endpoint (frontend sends { status: "APPROVED" | "REJECTED" })
router.patch("/users/:id/kyc", kycHandler);

// KYC — legacy separate endpoints
router.patch("/users/:id/kyc/approve", approveKycHandler);
router.patch("/users/:id/kyc/reject", rejectKycHandler);

// Suspend / unsuspend — frontend sends { suspend: boolean }
router.patch("/users/:id/suspend", suspendUserHandler);

// Badge — frontend sends { badge }, legacy sends { label }
router.post("/users/:id/badge", awardBadgeHandler);
router.post("/users/:id/badges", awardBadgeHandler);

router.get("/users/:id", getUserDetailHandler);

router.get("/users/:id/kyc-documents", getAdminKycDocumentsHandler);

export default router;
