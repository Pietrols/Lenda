import { Router, IRouter } from "express";
import { authenticate, requireRole } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { CreateBookingSchema } from "@lenda/schemas";
import {
  createBookingHandler,
  transitionBookingHandler,
  confirmHandoverHandler,
  getBookingsHandler,
  getBookingByIdHandler,
} from "../controllers/booking.controller";

const router: IRouter = Router();

router.post(
  "/",
  authenticate,
  requireRole("GUEST"),
  validate(CreateBookingSchema),
  createBookingHandler,
);

router.post("/:id/handover/confirm", authenticate, confirmHandoverHandler);

router.patch("/:id/status", authenticate, transitionBookingHandler);

router.get("/", authenticate, getBookingsHandler);
router.get("/:id", authenticate, getBookingByIdHandler);

export default router;
