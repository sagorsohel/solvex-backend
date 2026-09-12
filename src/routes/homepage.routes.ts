import { Router } from "express";
import { getHomepage, updateHomepage } from "../controllers/homepage.controller.js";
import { verifyToken, requireRole } from "../middleware/auth.js";

const router = Router();

// GET /api/homepage (Public endpoint for main website)
router.get("/", getHomepage);

// PUT /api/homepage (Admin/Editor protected endpoint)
router.put("/", verifyToken, requireRole(["admin", "editor"]), updateHomepage);

export default router;
