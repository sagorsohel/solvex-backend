import { Router } from "express";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectCategories,
  createProjectCategory,
  updateProjectCategory,
  deleteProjectCategory,
  getProjectsPageSettings,
  updateProjectsPageSettings,
} from "../controllers/project.controller.js";
import { verifyToken, requireRole } from "../middleware/auth.js";

// Router for /api/projects
export const projectsRouter = Router();

projectsRouter.get("/", getProjects);
projectsRouter.get("/:id", getProjectById);
projectsRouter.post("/", verifyToken, requireRole(["admin", "editor"]), createProject);
projectsRouter.put("/:id", verifyToken, requireRole(["admin", "editor"]), updateProject);
projectsRouter.delete("/:id", verifyToken, requireRole(["admin"]), deleteProject);

// Router for /api/project-categories
export const projectCategoriesRouter = Router();

projectCategoriesRouter.get("/", getProjectCategories);
projectCategoriesRouter.post("/", verifyToken, requireRole(["admin", "editor"]), createProjectCategory);
projectCategoriesRouter.put("/:id", verifyToken, requireRole(["admin", "editor"]), updateProjectCategory);
projectCategoriesRouter.delete("/:id", verifyToken, requireRole(["admin"]), deleteProjectCategory);

// Router for /api/projects-page
export const projectsPageRouter = Router();

projectsPageRouter.get("/", getProjectsPageSettings);
projectsPageRouter.put("/", verifyToken, requireRole(["admin", "editor"]), updateProjectsPageSettings);

export default projectsRouter;
