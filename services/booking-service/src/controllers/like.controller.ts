import { Request, Response, NextFunction } from "express";
import { toggleLike, getLikeCount } from "../services/like.service";

export async function toggleLikeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.sub;
    const result = await toggleLike(userId, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getLikeCountHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { targetId, targetType } = req.params;
    const result = await getLikeCount(targetId, targetType);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
