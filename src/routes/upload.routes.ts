import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${sanitizedBase}-${uniqueSuffix}${ext}`);
  },
});

// File filter to allow only image files
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "image/avif",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (JPEG, PNG, WebP, GIF, SVG, AVIF) are allowed!"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
});

// Accept single file from 'file' or 'image' field
const uploadSingle = (req: Request, res: Response, next: any) => {
  const handler = upload.fields([
    { name: "file", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]);

  handler(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File size exceeds 15MB limit.",
        });
      }
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

/**
 * POST /api/upload
 * Upload a single image file
 */
router.post("/", uploadSingle, (req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const uploadedFile = files?.file?.[0] || files?.image?.[0];

  if (!uploadedFile) {
    return res.status(400).json({
      success: false,
      message: "No image file provided in 'file' or 'image' form field.",
    });
  }

  // Construct full public URL
  const protocol = req.protocol;
  const host = req.get("host") || `localhost:${process.env.PORT || 5000}`;
  const relativeUrl = `/uploads/${uploadedFile.filename}`;
  const fullUrl = `${protocol}://${host}${relativeUrl}`;

  return res.status(201).json({
    success: true,
    message: "Image uploaded successfully",
    url: fullUrl,
    relativeUrl,
    filename: uploadedFile.filename,
    originalName: uploadedFile.originalname,
    mimetype: uploadedFile.mimetype,
    size: uploadedFile.size,
  });
});

export default router;
