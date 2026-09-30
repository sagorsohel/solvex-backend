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
  getAreas,
  createArea,
  updateArea,
  deleteArea,
  getPanels,
  createPanel,
  updatePanel,
  deletePanel,
  getAccessories,
  createAccessory,
  updateAccessory,
  deleteAccessory,
  getPackages,
  createPackage,
  updatePackage,
  deletePackage,
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
calculatorRouter.delete("/solar-types/:id", verifyToken, requireRole(["admin", "editor"]), deleteSolarType);

// Battery Types CRUD
calculatorRouter.get("/battery-types", verifyToken, getBatteryTypes);
calculatorRouter.post("/battery-types", verifyToken, requireRole(["admin", "editor"]), createBatteryType);
calculatorRouter.put("/battery-types/:id", verifyToken, requireRole(["admin", "editor"]), updateBatteryType);
calculatorRouter.delete("/battery-types/:id", verifyToken, requireRole(["admin", "editor"]), deleteBatteryType);

// Watt-Range Inverter & Recommendation Packages CRUD
calculatorRouter.get("/recommendations", verifyToken, getRecommendations);
calculatorRouter.post("/recommendations", verifyToken, requireRole(["admin", "editor"]), createRecommendation);
calculatorRouter.put("/recommendations/:id", verifyToken, requireRole(["admin", "editor"]), updateRecommendation);
calculatorRouter.delete("/recommendations/:id", verifyToken, requireRole(["admin", "editor"]), deleteRecommendation);

// Inverters CRUD aliases (direct mapping to Inverter / Recommendation packages)
calculatorRouter.get("/inverters", verifyToken, getRecommendations);
calculatorRouter.post("/inverters", verifyToken, requireRole(["admin", "editor"]), createRecommendation);
calculatorRouter.put("/inverters/:id", verifyToken, requireRole(["admin", "editor"]), updateRecommendation);
calculatorRouter.delete("/inverters/:id", verifyToken, requireRole(["admin", "editor"]), deleteRecommendation);

// Installation Areas & Dynamic Services CRUD
calculatorRouter.get("/areas", verifyToken, getAreas);
calculatorRouter.post("/areas", verifyToken, requireRole(["admin", "editor"]), createArea);
calculatorRouter.put("/areas/:id", verifyToken, requireRole(["admin", "editor"]), updateArea);
calculatorRouter.delete("/areas/:id", verifyToken, requireRole(["admin", "editor"]), deleteArea);

// Solar Panels Catalog CRUD
calculatorRouter.get("/panels", verifyToken, getPanels);
calculatorRouter.post("/panels", verifyToken, requireRole(["admin", "editor"]), createPanel);
calculatorRouter.put("/panels/:id", verifyToken, requireRole(["admin", "editor"]), updatePanel);
calculatorRouter.delete("/panels/:id", verifyToken, requireRole(["admin", "editor"]), deletePanel);

// Solar Accessories Packages CRUD
calculatorRouter.get("/accessories", verifyToken, getAccessories);
calculatorRouter.post("/accessories", verifyToken, requireRole(["admin", "editor"]), createAccessory);
calculatorRouter.put("/accessories/:id", verifyToken, requireRole(["admin", "editor"]), updateAccessory);
calculatorRouter.delete("/accessories/:id", verifyToken, requireRole(["admin", "editor"]), deleteAccessory);

// Complete Solar Packages Panel CRUD
calculatorRouter.get("/packages", verifyToken, getPackages);
calculatorRouter.post("/packages", verifyToken, requireRole(["admin", "editor"]), createPackage);
calculatorRouter.put("/packages/:id", verifyToken, requireRole(["admin", "editor"]), updatePackage);
calculatorRouter.delete("/packages/:id", verifyToken, requireRole(["admin", "editor"]), deletePackage);

export default calculatorRouter;


