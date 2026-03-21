import { Router, IRouter } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { MarkNotificationReadSchema } from "@lenda/schemas";
import {
  getNotificationsHandler,
  markReadHandler,
  getUnreadCountHandler,
} from "../controllers/notification.controller";

const router: IRouter = Router();

router.get("/", authenticate, getNotificationsHandler);
router.get("/unread-count", authenticate, getUnreadCountHandler);
router.patch(
  "/read",
  authenticate,
  validate(MarkNotificationReadSchema),
  markReadHandler,
);

export default router;
