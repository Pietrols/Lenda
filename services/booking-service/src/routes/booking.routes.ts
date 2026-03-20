import { Router, IRouter } from "express";
import { authenticate, requireRole } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { CreateBookingSchema } from "@lenda/schemas";
import {
  createBookingHandler,
  transitionBookingHandler,
  confirmHandoverHandler,
} from "../controllers/booking.controller";

const router: IRouter = Router();

router.post(
  "/",
  authenticate,
  requireRole("GUEST"),
  validate(CreateBookingSchema),
  createBookingHandler,
);

router.patch("/:id/status", authenticate, transitionBookingHandler);

router.post("/:id/handover/confirm", authenticate, confirmHandoverHandler);

export default router;
