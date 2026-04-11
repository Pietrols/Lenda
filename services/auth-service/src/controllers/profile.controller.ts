import { Request, Response, NextFunction } from "express";
import {
  updateProfile,
  getProfile,
  uploadProfilePhoto,
  getUploadSignature,
  saveProfilePhoto,
  addRole,
  uploadKycDocument,
  getKycDocuments,
} from "../services/profile.service";

export async function updateProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.sub;
    const user = await updateProfile(userId, req.body);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function getProfileMeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await getProfile(req.user!.sub);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function getProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await getProfile(req.params.id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function uploadProfilePhotoHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.file) throw new Error("No file uploaded");
    const userId = req.user!.sub;
    const result = await uploadProfilePhoto(userId, req.file);
    res.json({ user: result });
  } catch (err) {
    next(err);
  }
}

export async function getUploadSignatureHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.sub;
    const result = await getUploadSignature(userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function saveProfilePhotoHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.sub;
    const { photoUrl } = req.body;
    const result = await saveProfilePhoto(userId, photoUrl);
    res.json({ user: result });
  } catch (err) {
    next(err);
  }
}

export async function addRoleHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.sub;
    const { role } = req.body;
    if (!role) throw new Error("Role is required");
    const user = await addRole(userId, role);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function getKycDocumentsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.sub;
    const docs = await getKycDocuments(userId);
    res.json({ documents: docs });
  } catch (err) {
    next(err);
  }
}

export async function uploadKycDocumentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.file) throw new Error("No file uploaded");
    const userId = req.user!.sub;
    const docType = req.body.docType as string;
    if (!docType) throw new Error("docType is required");
    const result = await uploadKycDocument(userId, docType, req.file);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
