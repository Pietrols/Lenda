import { Router, IRouter } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { UpdateProfileSchema } from "@lenda/schemas";
import { upload, uploadDocument } from "../lib/upload";
import {
  updateProfileHandler,
  getProfileHandler,
  getProfileMeHandler,
  uploadProfilePhotoHandler,
  getUploadSignatureHandler,
  saveProfilePhotoHandler,
  addRoleHandler,
  uploadKycDocumentHandler,
  getKycDocumentsHandler,
  resubmitKycHandler,
  uploadPortfolioImageHandler,
  deletePortfolioImageHandler,
  getPortfolioImagesHandler,
} from "../controllers/profile.controller";

const router: IRouter = Router();

router.get("/me/portfolio", authenticate, getPortfolioImagesHandler);
router.post(
  "/me/portfolio",
  authenticate,
  upload.single("image"),
  uploadPortfolioImageHandler,
);
router.delete(
  "/me/portfolio/:imageId",
  authenticate,
  deletePortfolioImageHandler,
);

// All /me routes must come before /:id to avoid Express matching "me" as an ID
router.get("/me", authenticate, getProfileMeHandler);
router.get("/me/upload-signature", authenticate, getUploadSignatureHandler);
router.get("/me/kyc", authenticate, getKycDocumentsHandler);
router.patch(
  "/me",
  authenticate,
  validate(UpdateProfileSchema),
  updateProfileHandler,
);
router.post(
  "/me/photo",
  authenticate,
  upload.single("photo"),
  uploadProfilePhotoHandler,
);
router.patch("/me/photo-url", authenticate, saveProfilePhotoHandler);
router.patch("/me/role", authenticate, addRoleHandler);
router.post(
  "/me/kyc",
  authenticate,
  uploadDocument.single("document"),
  uploadKycDocumentHandler,
);

// Public profile by ID — must be last
router.get("/:id", getProfileHandler);

router.patch("/me/kyc/resubmit", authenticate, resubmitKycHandler);

export default router;
