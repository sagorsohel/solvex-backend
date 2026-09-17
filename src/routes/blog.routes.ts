import { Router } from "express";
import {
  getBlogs,
  getBlogBySlug,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
} from "../controllers/blog.controller.js";
import { verifyToken, requireRole } from "../middleware/auth.js";

export const blogsRouter = Router();

// Public routes
blogsRouter.get("/", getBlogs);
blogsRouter.get("/:slug", getBlogBySlug);

// Protected admin routes
blogsRouter.get("/admin/:id", verifyToken, requireRole(["admin", "editor", "viewer"]), getBlogById);
blogsRouter.post("/", verifyToken, requireRole(["admin", "editor"]), createBlog);
blogsRouter.put("/:id", verifyToken, requireRole(["admin", "editor"]), updateBlog);
blogsRouter.delete("/:id", verifyToken, requireRole(["admin"]), deleteBlog);

export default blogsRouter;
