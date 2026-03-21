import { Request, Response, NextFunction } from "express";
import { updateProfile, getProfile } from "../services/profile.service";

export async function updateProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.sub;
    const user = await updateProfile(userId, req.body);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function getProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await getProfile(req.params.id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
