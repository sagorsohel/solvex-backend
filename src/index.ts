import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import productRoutes from "./routes/product.routes.js";
import aboutRoutes from "./routes/about.routes.js";
import boardRoutes from "./routes/board.routes.js";
import uploadRoutes, { getUploadsDir } from "./routes/upload.routes.js";
import fs from "fs";
import { servicesRouter, servicesPageRouter } from "./routes/service.routes.js";
import {
  projectsRouter,
  projectCategoriesRouter,
  projectsPageRouter,
} from "./routes/project.routes.js";
import {
  sisterConcernsRouter,
  productCategoriesRouter,
  productSubCategoriesRouter,
  productTreeCategoriesRouter,
  productBrandsRouter,
  productModelsRouter,
} from "./routes/products-settings.routes.js";
import homepageRoutes from "./routes/homepage.routes.js";
import solutionsRoutes from "./routes/solutions.routes.js";
import translateRoutes from "./routes/translate.routes.js";
import blogsRouter from "./routes/blog.routes.js";
import siteSettingsRoutes from "./routes/site-settings.routes.js";
import testimonialsRouter from "./routes/testimonials.routes.js";
import pageHeaderRoutes from "./routes/page-header.routes.js";
import { testDbConnection, pool } from "./db/index.js";
import { ensureProductsColumns } from "./controllers/product.controller.js";
import { ensureBlogTable } from "./controllers/blog.controller.js";
import { ensureSiteSettingsTable } from "./controllers/site-settings.controller.js";
import { ensureTestimonialsTable } from "./controllers/testimonials.controller.js";
import { ensureAboutPageColumns } from "./controllers/about.controller.js";
import { ensurePageHeadersTable } from "./controllers/page-header.controller.js";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable reverse proxy trust (Required for Hostinger / Nginx / Cloudflare SSL)
app.set("trust proxy", 1);

// CORS configuration (Accepts * or comma-separated domains from CORS_ORIGIN)
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.includes(",")
    ? process.env.CORS_ORIGIN.split(",").map((item) => item.trim())
    : process.env.CORS_ORIGIN.trim()
  : "*";

// Middleware
app.use(
  cors({
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Static uploads directory - supports persistent external storage (UPLOADS_DIR)
const uploadsDir = getUploadsDir();
const localUploadsDir = path.resolve(process.cwd(), "uploads");

// Serve static uploads from persistent directory
app.use("/uploads", express.static(uploadsDir));
app.use("/api/uploads", express.static(uploadsDir));

// Fallback to local ./uploads if custom directory is configured
if (uploadsDir !== localUploadsDir) {
  app.use("/uploads", express.static(localUploadsDir));
  app.use("/api/uploads", express.static(localUploadsDir));
}

// Health & Info Endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "Solvex Backend API",
    orm: "Drizzle ORM (MySQL)",
    auth: "JWT Authentication",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/products", productRoutes);
app.use("/api/homepage", homepageRoutes);
app.use("/api/about-page", aboutRoutes);
app.use("/api/about-us", aboutRoutes);
app.use("/api/board-members", boardRoutes);
app.use("/api/board-of-directors", boardRoutes);
app.use("/api/services", servicesRouter);
app.use("/api/services-page", servicesPageRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/project-categories", projectCategoriesRouter);
app.use("/api/projects-page", projectsPageRouter);
app.use("/api/testimonials", testimonialsRouter);
app.use("/api", solutionsRoutes);

// Products Settings & Sister Concerns Hierarchy Routes
app.use("/api/sister-concerns", sisterConcernsRouter);
app.use("/api/product-categories", productCategoriesRouter);
app.use("/api/product-sub-categories", productSubCategoriesRouter);
app.use("/api/product-tree-categories", productTreeCategoriesRouter);
app.use("/api/product-brands", productBrandsRouter);
app.use("/api/product-models", productModelsRouter);
app.use("/api/translate", translateRoutes);
app.use("/api/blogs", blogsRouter);
app.use("/api/site-settings", siteSettingsRoutes);
app.use("/api/page-headers", pageHeaderRoutes);


// 404 Handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "API endpoint not found" });
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled API Error:", err);
  res.status(500).json({ success: false, message: "Internal server error", error: err?.message });
});

const server = app.listen(PORT, async () => {
  console.log(`🚀 Solvex Backend running at http://localhost:${PORT}`);
  console.log(`📦 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📁 Uploads Storage Directory: ${uploadsDir}`);
  await testDbConnection();
  await ensureProductsColumns();
  await ensureBlogTable();
  await ensureSiteSettingsTable();
  await ensureTestimonialsTable();
  await ensureAboutPageColumns();
  await ensurePageHeadersTable();

  // Sync any existing legacy images from ./uploads to persistent uploadsDir
  if (uploadsDir !== localUploadsDir && fs.existsSync(localUploadsDir)) {
    try {
      const files = fs.readdirSync(localUploadsDir);
      for (const file of files) {
        if (file === ".gitkeep") continue;
        const src = path.join(localUploadsDir, file);
        const dest = path.join(uploadsDir, file);
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
        }
      }
    } catch (e) {
      console.warn("Could not sync local uploads to persistent directory:", e);
    }
  }
});

// Graceful shutdown on reload/termination
const shutdown = async () => {
  server.close(() => {
    console.log("🛑 HTTP server closed.");
    pool.end().then(() => {
      console.log("🛑 MySQL connection pool closed.");
      process.exit(0);
    });
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export default app;
