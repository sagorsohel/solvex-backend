import { Router } from "express";
import { getAboutPage, updateAboutPage } from "../controllers/about.controller.js";
import { verifyToken, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", getAboutPage);
router.put("/", verifyToken, requireRole(["admin", "editor"]), updateAboutPage);

export default router;
