import { Router, IRouter } from "express";
import { authenticate, requireRole } from "../middleware/authenticate";
import {
  listUsersHandler,
  kycHandler,
  approveKycHandler,
  rejectKycHandler,
  awardBadgeHandler,
  suspendUserHandler,
  getUserDetailHandler,
  getAdminKycDocumentsHandler,
  grantProHandler,
  revokeProHandler,
  adjustListingTierHandler,
  assignRolesHandler,
} from "../controllers/admin.controller";
import { Role } from "@lenda/types";

const router: IRouter = Router();

router.use(authenticate, requireRole(Role.ADMIN));

router.get("/users", listUsersHandler);
router.get("/users/:id", getUserDetailHandler);
router.get("/users/:id/kyc-documents", getAdminKycDocumentsHandler);

router.patch("/users/:id/kyc", kycHandler);
router.patch("/users/:id/kyc/approve", approveKycHandler);
router.patch("/users/:id/kyc/reject", rejectKycHandler);
router.patch("/users/:id/suspend", suspendUserHandler);
router.patch("/users/:id/listing-tier", adjustListingTierHandler);
router.patch("/users/:id/roles", assignRolesHandler);

router.post("/users/:id/badge", awardBadgeHandler);
router.post("/users/:id/badges", awardBadgeHandler);
router.post("/users/:id/grant-pro", grantProHandler);
router.post("/users/:id/revoke-pro", revokeProHandler);

export default router;
