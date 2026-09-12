import { Router } from "express";
import { getProducts, createProduct, deleteProduct, getInquiries } from "../controllers/product.controller.js";
import { verifyToken, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(verifyToken);

router.get("/", getProducts);
router.post("/", requireRole(["admin", "editor"]), createProduct);
router.delete("/:id", requireRole(["admin"]), deleteProduct);
router.get("/inquiries/all", getInquiries);

export default router;
