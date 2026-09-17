import { Router } from "express";
import { getSiteSettings, updateSiteSettings } from "../controllers/site-settings.controller.js";
import { verifyToken, requireRole } from "../middleware/auth.js";

const router = Router();

// GET /api/site-settings (Public endpoint for website frontend & admin)
router.get("/", getSiteSettings);

// PUT /api/site-settings (Admin/Editor protected endpoint)
router.put("/", verifyToken, requireRole(["admin", "editor"]), updateSiteSettings);

export default router;
