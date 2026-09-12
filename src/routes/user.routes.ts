import { Router } from "express";
import { getUsers, createUser, updateUser, deleteUser } from "../controllers/user.controller.js";
import { verifyToken, requireRole } from "../middleware/auth.js";

const router = Router();

// Protect all user routes with JWT verification
router.use(verifyToken);

router.get("/", getUsers);
router.post("/", requireRole(["admin"]), createUser);
router.put("/:id", requireRole(["admin"]), updateUser);
router.delete("/:id", requireRole(["admin"]), deleteUser);

export default router;
