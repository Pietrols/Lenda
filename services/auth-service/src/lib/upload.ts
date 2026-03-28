import multer from "multer";

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    ];
    const isHeic = file.originalname.toLowerCase().match(/\.(heic|heif)$/);
    if (!allowed.includes(file.mimetype) && !isHeic) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});
