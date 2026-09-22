import { Router } from "express";
import {
  getPageHeaders,
  getPageHeaderByKey,
  updatePageHeader,
} from "../controllers/page-header.controller.js";
import { verifyToken, requireRole } from "../middleware/auth.js";

const router = Router();

// GET /api/page-headers (Public endpoint for all page headers)
router.get("/", getPageHeaders);

// GET /api/page-headers/:pageKey (Public endpoint for single page header)
router.get("/:pageKey", getPageHeaderByKey);

// PUT /api/page-headers/:pageKey (Protected admin/editor endpoint to update a page header)
router.put("/:pageKey", verifyToken, requireRole(["admin", "editor"]), updatePageHeader);

export default router;
