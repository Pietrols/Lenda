import { Request, Response, NextFunction } from "express";
import {
  sendMessage,
  getMessages,
  getUnreadCount,
} from "../services/message.service";

export async function sendMessageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.sub;
    const { bookingId } = req.params;
    const { message } = req.body;
    const msg = await sendMessage(bookingId, userId, message);
    res.status(201).json({ message: msg });
  } catch (err) {
    next(err);
  }
}

export async function getMessagesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.sub;
    const { bookingId } = req.params;
    const messages = await getMessages(bookingId, userId);
    res.json({ messages });
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
    const { bookingId } = req.params;
    const count = await getUnreadCount(bookingId, userId);
    res.json({ count });
  } catch (err) {
    next(err);
  }
}
