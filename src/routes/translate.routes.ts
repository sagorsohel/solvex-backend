import { Router } from "express";
import { translateHandler } from "../controllers/translate.controller.js";

const router = Router();

// POST /api/translate
router.post("/", translateHandler);

export default router;
