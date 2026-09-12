import { Router } from "express";
import {
  getSisterConcerns,
  getSisterConcernById,
  createSisterConcern,
  updateSisterConcern,
  deleteSisterConcern,
  getProductCategories,
  getProductCategoryById,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
  getProductSubCategories,
  createProductSubCategory,
  updateProductSubCategory,
  deleteProductSubCategory,
  getProductTreeCategories,
  createProductTreeCategory,
  updateProductTreeCategory,
  deleteProductTreeCategory,
  getProductBrands,
  getProductBrandById,
  createProductBrand,
  updateProductBrand,
  deleteProductBrand,
  getProductModels,
  getProductModelById,
  createProductModel,
  updateProductModel,
  deleteProductModel,
} from "../controllers/products-settings.controller.js";
import { verifyToken, requireRole } from "../middleware/auth.js";

// 1. /api/sister-concerns
export const sisterConcernsRouter = Router();
sisterConcernsRouter.get("/", getSisterConcerns);
sisterConcernsRouter.get("/:id", getSisterConcernById);
sisterConcernsRouter.post("/", verifyToken, requireRole(["admin", "editor"]), createSisterConcern);
sisterConcernsRouter.put("/:id", verifyToken, requireRole(["admin", "editor"]), updateSisterConcern);
sisterConcernsRouter.delete("/:id", verifyToken, requireRole(["admin"]), deleteSisterConcern);

// 2. /api/product-categories
export const productCategoriesRouter = Router();
productCategoriesRouter.get("/", getProductCategories);
productCategoriesRouter.get("/:id", getProductCategoryById);
productCategoriesRouter.post("/", verifyToken, requireRole(["admin", "editor"]), createProductCategory);
productCategoriesRouter.put("/:id", verifyToken, requireRole(["admin", "editor"]), updateProductCategory);
productCategoriesRouter.delete("/:id", verifyToken, requireRole(["admin"]), deleteProductCategory);

// 3. /api/product-sub-categories
export const productSubCategoriesRouter = Router();
productSubCategoriesRouter.get("/", getProductSubCategories);
productSubCategoriesRouter.post("/", verifyToken, requireRole(["admin", "editor"]), createProductSubCategory);
productSubCategoriesRouter.put("/:id", verifyToken, requireRole(["admin", "editor"]), updateProductSubCategory);
productSubCategoriesRouter.delete("/:id", verifyToken, requireRole(["admin"]), deleteProductSubCategory);

// 4. /api/product-tree-categories
export const productTreeCategoriesRouter = Router();
productTreeCategoriesRouter.get("/", getProductTreeCategories);
productTreeCategoriesRouter.post("/", verifyToken, requireRole(["admin", "editor"]), createProductTreeCategory);
productTreeCategoriesRouter.put("/:id", verifyToken, requireRole(["admin", "editor"]), updateProductTreeCategory);
productTreeCategoriesRouter.delete("/:id", verifyToken, requireRole(["admin"]), deleteProductTreeCategory);

// 5. /api/product-brands
export const productBrandsRouter = Router();
productBrandsRouter.get("/", getProductBrands);
productBrandsRouter.get("/:id", getProductBrandById);
productBrandsRouter.post("/", verifyToken, requireRole(["admin", "editor"]), createProductBrand);
productBrandsRouter.put("/:id", verifyToken, requireRole(["admin", "editor"]), updateProductBrand);
productBrandsRouter.delete("/:id", verifyToken, requireRole(["admin"]), deleteProductBrand);

// 6. /api/product-models
export const productModelsRouter = Router();
productModelsRouter.get("/", getProductModels);
productModelsRouter.get("/:id", getProductModelById);
productModelsRouter.post("/", verifyToken, requireRole(["admin", "editor"]), createProductModel);
productModelsRouter.put("/:id", verifyToken, requireRole(["admin", "editor"]), updateProductModel);
productModelsRouter.delete("/:id", verifyToken, requireRole(["admin"]), deleteProductModel);
