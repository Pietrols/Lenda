import { Router, IRouter } from "express";
import { authenticate, requireRole } from "../middleware/authenticate";
import {
  verifyListingHandler,
  suspendListingHandler,
  removeReviewHandler,
} from "../controllers/admin.controller";

const router: IRouter = Router();

router.use(authenticate, requireRole("ADMIN"));

router.patch("/listings/:id/verify", verifyListingHandler);
router.patch("/listings/:id/suspend", suspendListingHandler);
router.patch("/reviews/:id/remove", removeReviewHandler);

export default router;
