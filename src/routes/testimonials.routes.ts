import { Router } from "express";
import {
  submitPublicTestimonial,
  getPublicTestimonials,
  getAdminTestimonials,
  updateTestimonialStatus,
  updateTestimonial,
  deleteTestimonial,
} from "../controllers/testimonials.controller.js";
import { verifyToken, requireRole } from "../middleware/auth.js";

export const testimonialsRouter = Router();

// Public routes (anyone can submit without login; anyone can view approved testimonials)
testimonialsRouter.post("/", submitPublicTestimonial);
testimonialsRouter.get("/", getPublicTestimonials);

// Protected admin routes
testimonialsRouter.get("/admin", verifyToken, requireRole(["admin", "editor", "viewer"]), getAdminTestimonials);
testimonialsRouter.put("/admin/:id/status", verifyToken, requireRole(["admin", "editor"]), updateTestimonialStatus);
testimonialsRouter.put("/admin/:id", verifyToken, requireRole(["admin", "editor"]), updateTestimonial);
testimonialsRouter.delete("/admin/:id", verifyToken, requireRole(["admin"]), deleteTestimonial);

export default testimonialsRouter;
