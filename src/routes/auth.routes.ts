import { Router } from "express";
import { register, login, getMe, setupSuperAdmin } from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/auth.js";

const router = Router();

router.post("/super-admin/setup", setupSuperAdmin);
router.post("/register", register);
router.post("/login", login);
router.get("/me", verifyToken, getMe);

export default router;
