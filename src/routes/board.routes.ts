import { Router } from "express";
import {
  getBoardMembers,
  createBoardMember,
  updateBoardMember,
  deleteBoardMember,
} from "../controllers/board.controller.js";
import { verifyToken, requirePermission } from "../middleware/auth.js";

const router = Router();

// Public endpoint to get all board members (Website & Admin)
router.get("/", getBoardMembers);

// Protected endpoints governed by board_members granular permissions
router.post("/", verifyToken, requirePermission("board_members", "create"), createBoardMember);
router.put("/:id", verifyToken, requirePermission("board_members", "edit"), updateBoardMember);
router.delete("/:id", verifyToken, requirePermission("board_members", "delete"), deleteBoardMember);

export default router;
