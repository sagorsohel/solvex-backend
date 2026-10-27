import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type PermissionAction = "view" | "create" | "edit" | "delete";

export interface AuthUserPayload {
  id: number;
  email: string;
  role: "super_admin" | "admin" | "editor" | "viewer" | string;
  name: string;
  permissions?: Record<string, { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean }> | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export const verifyToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Access token missing or invalid authorization header.",
    });
    return;
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env.JWT_SECRET || "super_secret_jwt_key_solvex_2026_change_in_production";

  try {
    const decoded = jwt.verify(token, secret) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or expired token.",
      error: error.message,
    });
  }
};

export const requireRole = (allowedRoles: Array<string>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required." });
      return;
    }

    // Super Admin has unrestricted authority and bypasses all role restrictions
    if (req.user.role === "super_admin") {
      next();
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to access this resource.",
      });
      return;
    }

    next();
  };
};

/**
 * Granular module-level permission middleware
 * Allows super_admin automatically, or validates user's specific permissions.
 */
export const requirePermission = (moduleName: string, action: PermissionAction) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required." });
      return;
    }

    // Super Admin has full unrestricted access
    if (req.user.role === "super_admin") {
      next();
      return;
    }

    const perms = req.user.permissions;
    if (perms && typeof perms === "object") {
      const modPerm = perms[moduleName];
      if (modPerm && typeof modPerm === "object" && modPerm[action] === true) {
        next();
        return;
      }
    }

    // Legacy fallback: if user role is "admin" with no granular permissions configured
    if (req.user.role === "admin" && (!perms || Object.keys(perms).length === 0)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: `Forbidden: You do not have permission to ${action} ${moduleName.replace("_", " ")}.`,
    });
  };
};
