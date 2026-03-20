import { Router, IRouter } from "express";
import { authenticate, requireRole } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { CreateBookingSchema } from "@lenda/schemas";
import { createBookingHandler } from "../controllers/booking.controller";

const router: IRouter = Router();

router.post(
  "/",
  authenticate,
  requireRole("GUEST"),
  validate(CreateBookingSchema),
  createBookingHandler,
);

export default router;
