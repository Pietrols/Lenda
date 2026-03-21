import { Router, IRouter } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { CreateLikeSchema } from "@lenda/schemas";
import {
  toggleLikeHandler,
  getLikeCountHandler,
} from "../controllers/like.controller";

const router: IRouter = Router();

router.post("/", authenticate, validate(CreateLikeSchema), toggleLikeHandler);
router.get("/:targetType/:targetId", getLikeCountHandler);

export default router;
