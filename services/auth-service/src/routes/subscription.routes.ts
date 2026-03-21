import { Router, IRouter } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { UpgradeSubscriptionSchema } from "@lenda/schemas";
import {
  upgradeSubscriptionHandler,
  cancelSubscriptionHandler,
  getSubscriptionStatusHandler,
} from "../controllers/subscription.controller";

const router: IRouter = Router();

router.get("/status", authenticate, getSubscriptionStatusHandler);
router.post(
  "/upgrade",
  authenticate,
  validate(UpgradeSubscriptionSchema),
  upgradeSubscriptionHandler,
);
router.post("/cancel", authenticate, cancelSubscriptionHandler);

export default router;
