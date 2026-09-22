import { Router } from "express";
import {
  getPublicCalculatorData,
  getAppliances,
  createAppliance,
  updateAppliance,
  deleteAppliance,
  getSolarTypes,
  createSolarType,
  updateSolarType,
  deleteSolarType,
  getBatteryTypes,
  createBatteryType,
  updateBatteryType,
  deleteBatteryType,
  getRecommendations,
  createRecommendation,
  updateRecommendation,
  deleteRecommendation,
} from "../controllers/calculator.controller.js";
import { verifyToken, requireRole } from "../middleware/auth.js";

export const calculatorRouter = Router();

// Public route for website calculation
calculatorRouter.get("/data", getPublicCalculatorData);
calculatorRouter.get("/", getPublicCalculatorData);

// Appliances CRUD
calculatorRouter.get("/appliances", verifyToken, getAppliances);
calculatorRouter.post("/appliances", verifyToken, requireRole(["admin", "editor"]), createAppliance);
calculatorRouter.put("/appliances/:id", verifyToken, requireRole(["admin", "editor"]), updateAppliance);
calculatorRouter.delete("/appliances/:id", verifyToken, requireRole(["admin"]), deleteAppliance);

// Solar Types CRUD
calculatorRouter.get("/solar-types", verifyToken, getSolarTypes);
calculatorRouter.post("/solar-types", verifyToken, requireRole(["admin", "editor"]), createSolarType);
calculatorRouter.put("/solar-types/:id", verifyToken, requireRole(["admin", "editor"]), updateSolarType);
calculatorRouter.delete("/solar-types/:id", verifyToken, requireRole(["admin"]), deleteSolarType);

// Battery Types CRUD
calculatorRouter.get("/battery-types", verifyToken, getBatteryTypes);
calculatorRouter.post("/battery-types", verifyToken, requireRole(["admin", "editor"]), createBatteryType);
calculatorRouter.put("/battery-types/:id", verifyToken, requireRole(["admin", "editor"]), updateBatteryType);
calculatorRouter.delete("/battery-types/:id", verifyToken, requireRole(["admin"]), deleteBatteryType);

// Watt-Range Recommendations & Product Linker CRUD
calculatorRouter.get("/recommendations", verifyToken, getRecommendations);
calculatorRouter.post("/recommendations", verifyToken, requireRole(["admin", "editor"]), createRecommendation);
calculatorRouter.put("/recommendations/:id", verifyToken, requireRole(["admin", "editor"]), updateRecommendation);
calculatorRouter.delete("/recommendations/:id", verifyToken, requireRole(["admin"]), deleteRecommendation);

export default calculatorRouter;
