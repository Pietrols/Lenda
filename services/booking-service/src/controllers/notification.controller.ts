import { Request, Response, NextFunction } from "express";
import {
  getNotifications,
  markNotificationsRead,
  getUnreadCount,
} from "../services/notification.service";

export async function getNotificationsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.sub;
    const notifications = await getNotifications(userId);
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
}

export async function markReadHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.sub;
    await markNotificationsRead(userId, req.body.ids);
    res.json({ message: "Notifications marked as read" });
  } catch (err) {
    next(err);
  }
}

export async function getUnreadCountHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.sub;
    const result = await getUnreadCount(userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
