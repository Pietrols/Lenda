import { Router, IRouter } from "express";
import { authenticate, requireRole } from "../middleware/authenticate";
import {
  getCategoriesHandler,
  suggestCategoryHandler,
  adminGetCategoriesHandler,
  adminReviewCategoryHandler,
} from "../controllers/category.controller";

const router: IRouter = Router();

// Public -- get all approved categories, optional ?pillar= filter
router.get("/", getCategoriesHandler);

// Authenticated -- suggest a new category
router.post("/suggest", authenticate, suggestCategoryHandler);

// Admin -- list all including pending, and review
router.get(
  "/admin",
  authenticate,
  requireRole("ADMIN"),
  adminGetCategoriesHandler,
);
router.patch(
  "/admin/:id/review",
  authenticate,
  requireRole("ADMIN"),
  adminReviewCategoryHandler,
);

export default router;
