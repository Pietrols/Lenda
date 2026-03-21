import { Router, IRouter } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { CreateReviewSchema } from "@lenda/schemas";
import {
  createReviewHandler,
  getListingReviewsHandler,
  getUserReviewsHandler,
} from "../controllers/review.controller";

const router: IRouter = Router();

router.post(
  "/",
  authenticate,
  validate(CreateReviewSchema),
  createReviewHandler,
);
router.get("/listing/:listingId", getListingReviewsHandler);
router.get("/user/:userId", getUserReviewsHandler);

export default router;
