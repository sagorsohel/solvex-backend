import { Router } from "express";
import {
  getBoardMembers,
  createBoardMember,
  updateBoardMember,
  deleteBoardMember,
} from "../controllers/board.controller.js";
import { verifyToken, requireRole } from "../middleware/auth.js";

const router = Router();

// Public endpoint to get all board members
router.get("/", getBoardMembers);

// Protected endpoints for admin/editor
router.post("/", verifyToken, requireRole(["admin", "editor"]), createBoardMember);
router.put("/:id", verifyToken, requireRole(["admin", "editor"]), updateBoardMember);
router.delete("/:id", verifyToken, requireRole(["admin"]), deleteBoardMember);

export default router;
