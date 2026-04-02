import { Router, IRouter } from "express";
import { authenticate } from "../middleware/authenticate";
import {
  sendMessageHandler,
  getMessagesHandler,
  getUnreadCountHandler,
} from "../controllers/message.controller";

const router: IRouter = Router({ mergeParams: true });

router.post("/", authenticate, sendMessageHandler);
router.get("/", authenticate, getMessagesHandler);
router.get("/unread", authenticate, getUnreadCountHandler);

export default router;
