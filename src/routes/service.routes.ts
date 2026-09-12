import { Router } from "express";
import {
  getServices,
  getServiceBySlug,
  createService,
  updateService,
  deleteService,
  getServicesPageSettings,
  updateServicesPageSettings,
} from "../controllers/service.controller.js";
import { verifyToken, requireRole } from "../middleware/auth.js";

// Router for /api/services
export const servicesRouter = Router();

servicesRouter.get("/", getServices);
servicesRouter.get("/:slug", getServiceBySlug);
servicesRouter.post("/", verifyToken, requireRole(["admin", "editor"]), createService);
servicesRouter.put("/:id", verifyToken, requireRole(["admin", "editor"]), updateService);
servicesRouter.delete("/:id", verifyToken, requireRole(["admin"]), deleteService);

// Router for /api/services-page
export const servicesPageRouter = Router();

servicesPageRouter.get("/", getServicesPageSettings);
servicesPageRouter.put("/", verifyToken, requireRole(["admin", "editor"]), updateServicesPageSettings);

export default servicesRouter;
