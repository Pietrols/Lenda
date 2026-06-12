import { Request, Response, NextFunction } from "express";
import { config } from "../config";

// Guards service-to-service routes — callers must present the shared internal key.
export function requireInternalKey(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.header("x-internal-key") !== config.INTERNAL_API_KEY) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  next();
}
