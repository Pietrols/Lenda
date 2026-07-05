import { Router, IRouter } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { CreateLikeSchema } from "@lenda/schemas";
import {
  toggleLikeHandler,
  getLikeCountHandler,
  getMyLikedListingsHandler,
} from "../controllers/like.controller";

const router: IRouter = Router();

router.post("/", authenticate, validate(CreateLikeSchema), toggleLikeHandler);

// Must be declared before /:targetType/:targetId or "me" is captured as a param.
router.get("/me/listings", authenticate, getMyLikedListingsHandler);
router.get("/:targetType/:targetId", getLikeCountHandler);

export default router;
