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

router.use(verifyToken);

router.get("/inquiries/all", getInquiries);
router.get("/next-sku", getNextSku);
router.get("/", getProducts);
router.get("/:id", getProductById);
router.post("/", requireRole(["admin", "editor"]), createProduct);
router.put("/:id", requireRole(["admin", "editor"]), updateProduct);
router.delete("/:id", requireRole(["admin"]), deleteProduct);

export default router;
