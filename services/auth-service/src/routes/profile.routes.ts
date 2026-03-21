import { Router, IRouter } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { UpdateProfileSchema } from "@lenda/schemas";
import {
  updateProfileHandler,
  getProfileHandler,
} from "../controllers/profile.controller";

const router: IRouter = Router();

router.get("/:id", getProfileHandler);
router.patch(
  "/me",
  authenticate,
  validate(UpdateProfileSchema),
  updateProfileHandler,
);

export default router;
