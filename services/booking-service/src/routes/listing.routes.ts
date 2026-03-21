import { Router, IRouter } from "express";
import { authenticate, requireRole } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { CreateListingSchema, UpdateListingSchema } from "@lenda/schemas";
import {
  createListingHandler,
  getListingsHandler,
  getListingByIdHandler,
  updateListingHandler,
  deleteListingHandler,
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
router.patch(
  "/:id",
  authenticate,
  requireRole("HOST"),
  validate(UpdateListingSchema),
  updateListingHandler,
);
router.delete("/:id", authenticate, requireRole("HOST"), deleteListingHandler);

export default router;
