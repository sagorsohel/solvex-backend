import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import productRoutes from "./routes/product.routes.js";
import aboutRoutes from "./routes/about.routes.js";
import boardRoutes from "./routes/board.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import { testDbConnection, pool } from "./db/index.js";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static uploads directory
app.use("/uploads", express.static(path.resolve("uploads")));

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
app.use("/api/about-page", aboutRoutes);
app.use("/api/about-us", aboutRoutes);
app.use("/api/board-members", boardRoutes);
app.use("/api/board-of-directors", boardRoutes);

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
  await testDbConnection();
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
