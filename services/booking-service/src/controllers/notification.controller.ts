import { Request, Response, NextFunction } from "express";
import {
  getNotifications,
  markNotificationsRead,
  getUnreadCount,
} from "../services/notification.service";
import { parsePagination } from "../lib/pagination";

export async function getNotificationsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.sub;
    const pagination = parsePagination(req.query);
    const { items, nextCursor } = await getNotifications(userId, pagination);
    // Legacy key `notifications` kept for backward compatibility.
    res.json({ notifications: items, nextCursor });
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
