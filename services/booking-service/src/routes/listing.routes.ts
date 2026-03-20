import { Router, IRouter } from "express";
import { authenticate, requireRole } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { CreateListingSchema } from "@lenda/schemas";
import {
  createListingHandler,
  getListingsHandler,
  getListingByIdHandler,
} from "../controllers/listing.controller";

const router: IRouter = Router();

router.get("/", getListingsHandler);
router.get("/:id", getListingByIdHandler);
router.post(
  "/",
  authenticate,
  requireRole("HOST"),
  validate(CreateListingSchema),
  createListingHandler,
);

export default router;
