import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

const router = Router();

/**
 * Returns the resolved directory for persistent uploads.
 * If UPLOADS_DIR is set in environment (e.g. '../uploads_storage' or '/var/uploads'),
 * it stores files OUTSIDE the git working tree so 'git pull', 'git clean' or builds NEVER delete them.
 */
export const getUploadsDir = (): string => {
  const customDir = process.env.UPLOADS_DIR;
  const uploadsDir = customDir
    ? path.resolve(customDir)
    : path.resolve(process.cwd(), "uploads");

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
};

/**
 * Check if Cloudinary credentials are provided in environment
 */
export const isCloudinaryConfigured = (): boolean => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

// Initialize Cloudinary if configured
if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log("☁️ Cloudinary cloud storage enabled for persistent uploads.");
}

// Multer disk storage pointing to getUploadsDir()
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, getUploadsDir());
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

// File filter to allow image files and PDFs
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
    "application/pdf",
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimeTypes.includes(file.mimetype) || ext === ".pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only image files (JPEG, PNG, WebP, GIF, SVG, AVIF) and PDF documents are allowed!"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for high-res PDF datasheets and assets
  },
});

// Accept single file from 'file', 'image', or 'pdf' field
const uploadSingle = (req: Request, res: Response, next: any) => {
  const handler = upload.fields([
    { name: "file", maxCount: 1 },
    { name: "image", maxCount: 1 },
    { name: "pdf", maxCount: 1 },
  ]);

  handler(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File size exceeds 100MB limit.",
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
 * Upload a single image or PDF document.
 * Automatically uploads to Cloudinary if configured in .env,
 * otherwise saves to persistent disk storage (UPLOADS_DIR).
 */
router.post("/", uploadSingle, async (req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const uploadedFile = files?.file?.[0] || files?.image?.[0] || files?.pdf?.[0];

  if (!uploadedFile) {
    return res.status(400).json({
      success: false,
      message: "No file provided in 'file', 'image', or 'pdf' form field.",
    });
  }

  // 1. If Cloudinary is enabled, upload to Cloudinary for 100% permanent cloud hosting
  if (isCloudinaryConfigured()) {
    try {
      const isPdf = uploadedFile.mimetype === "application/pdf" || uploadedFile.originalname.endsWith(".pdf");
      const uploadResult = await cloudinary.uploader.upload(uploadedFile.path, {
        folder: "solvex_uploads",
        resource_type: isPdf ? "raw" : "auto",
        use_filename: true,
        unique_filename: true,
      });

      // Remove local temporary file after successful cloud upload
      try {
        fs.unlinkSync(uploadedFile.path);
      } catch (_) {}

      return res.status(201).json({
        success: true,
        message: "File uploaded successfully to permanent cloud storage",
        url: uploadResult.secure_url,
        relativeUrl: uploadResult.secure_url,
        filename: uploadResult.public_id,
        originalName: uploadedFile.originalname,
        mimetype: uploadedFile.mimetype,
        size: uploadedFile.size,
        provider: "cloudinary",
      });
    } catch (cloudErr: any) {
      console.error("Cloudinary upload failed, using persistent local storage fallback:", cloudErr?.message);
      // Falls through to persistent disk storage response below
    }
  }

  // 2. Persistent Local Storage fallback
  const configuredBaseUrl = process.env.APP_URL || process.env.BASE_URL;
  let host = req.get("x-forwarded-host") || req.get("host") || `localhost:${process.env.PORT || 5000}`;
  let protocol = req.get("x-forwarded-proto") || req.protocol;
  if (process.env.NODE_ENV === "production" && host.includes(":5000")) {
    host = host.split(":")[0];
    protocol = "https";
  }
  const relativeUrl = `/uploads/${uploadedFile.filename}`;
  const fullUrl = configuredBaseUrl
    ? `${configuredBaseUrl.replace(/\/+$/, "")}${relativeUrl}`
    : `${protocol}://${host}${relativeUrl}`;

  return res.status(201).json({
    success: true,
    message: "File uploaded successfully to persistent local storage",
    url: fullUrl,
    relativeUrl,
    filename: uploadedFile.filename,
    originalName: uploadedFile.originalname,
    mimetype: uploadedFile.mimetype,
    size: uploadedFile.size,
    provider: "local",
  });
});

export default router;
