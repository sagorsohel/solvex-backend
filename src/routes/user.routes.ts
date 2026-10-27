import { Router } from "express";
import { getUsers, createUser, updateUser, deleteUser } from "../controllers/user.controller.js";
import { verifyToken, requirePermission } from "../middleware/auth.js";

const router = Router();

// Protect all user routes with JWT verification
router.use(verifyToken);

router.get("/", requirePermission("users", "view"), getUsers);
router.post("/", requirePermission("users", "create"), createUser);
router.put("/:id", requirePermission("users", "edit"), updateUser);
router.delete("/:id", requirePermission("users", "delete"), deleteUser);

export default router;
