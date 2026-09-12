import { Router } from "express";
import {
  getProducts,
  getProductById,
  getNextSku,
  createProduct,
  updateProduct,
  deleteProduct,
  getInquiries,
} from "../controllers/product.controller.js";
import { verifyToken, requireRole } from "../middleware/auth.js";

const router = Router();

// Public endpoints (Website & Catalog)
router.get("/", getProducts);
router.get("/next-sku", verifyToken, getNextSku);
router.get("/inquiries/all", verifyToken, getInquiries);
router.get("/:id", getProductById);

// Admin-only mutation endpoints
router.post("/", verifyToken, requireRole(["admin", "editor"]), createProduct);
router.put("/:id", verifyToken, requireRole(["admin", "editor"]), updateProduct);
router.delete("/:id", verifyToken, requireRole(["admin"]), deleteProduct);

export default router;
