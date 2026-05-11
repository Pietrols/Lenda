import { Request, Response, NextFunction } from "express";
import {
  getApprovedCategories,
  suggestCategory,
  getAllCategoriesAdmin,
  reviewCategory,
} from "../services/category.service";

export async function getCategoriesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const pillar = req.query.pillar as string | undefined;
    const categories = await getApprovedCategories(pillar);
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

export async function suggestCategoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = (req as any).user?.id;
    const { name, suggestedPillars = [] } = req.body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      res
        .status(400)
        .json({ message: "Category name must be at least 2 characters." });
      return;
    }

    const category = await suggestCategory(
      name.trim(),
      suggestedPillars,
      userId,
    );
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
}

export async function adminGetCategoriesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const categories = await getAllCategoriesAdmin();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

export async function adminReviewCategoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (action !== "APPROVED" && action !== "REJECTED") {
      res.status(400).json({ message: "Action must be APPROVED or REJECTED." });
      return;
    }

    const category = await reviewCategory(id, action);
    res.json({ category });
  } catch (err) {
    next(err);
  }
}
