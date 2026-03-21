import { Router, IRouter } from "express";
import { authenticate, requireRole } from "../middleware/authenticate";
import {
  approveKycHandler,
  rejectKycHandler,
  awardBadgeHandler,
  suspendUserHandler,
} from "../controllers/admin.controller";
import { Role } from "@lenda/types";

const router: IRouter = Router();

router.use(authenticate, requireRole(Role.ADMIN));

router.patch("/users/:id/kyc/approve", approveKycHandler);
router.patch("/users/:id/kyc/reject", rejectKycHandler);
router.patch("/users/:id/suspend", suspendUserHandler);
router.post("/users/:id/badges", awardBadgeHandler);

export default router;
