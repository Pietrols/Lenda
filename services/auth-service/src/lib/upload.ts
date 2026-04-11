import multer from "multer";

const storage = multer.memoryStorage();

const imageTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/avif",
  "image/tiff",
  "image/bmp",
];

const documentTypes = [...imageTypes, "application/pdf"];

// For profile photos and listing images — images only
export const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isHeicByName = /\.(heic|heif)$/i.test(file.originalname);
    if (!imageTypes.includes(file.mimetype) && !isHeicByName) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

// For KYC documents — images and PDFs
export const uploadDocument = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isHeicByName = /\.(heic|heif)$/i.test(file.originalname);
    const isPdfByName = /\.pdf$/i.test(file.originalname);
    if (
      !documentTypes.includes(file.mimetype) &&
      !isHeicByName &&
      !isPdfByName
    ) {
      return cb(new Error("Only images and PDFs are allowed"));
    }
    cb(null, true);
  },
});
