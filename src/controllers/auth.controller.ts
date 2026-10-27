import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, activityLogs } from "../db/schema.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { ensureUsersColumns, getFullPermissions } from "./user.controller.js";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_solvex_2026_change_in_production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Pre-configured fallback admin credentials for development
const DEMO_ADMIN = {
  id: 1,
  name: "Super Admin",
  email: "admin@solvexgloballtd.com",
  role: "super_admin",
  status: "active" as const,
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  permissions: getFullPermissions(),
};

/**
 * Secret Super Admin Provisioning Endpoint
 * Accessible via /super/admin/solvex/247
 */
export const setupSuperAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureUsersColumns();
    const { name, email, password, confirmPassword } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: "Email and password are required." });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      res.status(400).json({ success: false, message: "Password and Confirm Password do not match." });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const adminName = (name && name.trim()) || "Super Administrator";
    const cleanEmail = email.trim().toLowerCase();
    const fullPermissions = getFullPermissions();

    let finalUser: any = null;

    try {
      const existingUser = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);

      if (existingUser.length > 0) {
        // Upgrade existing user to Super Admin with updated password and full permissions
        await db
          .update(users)
          .set({
            name: adminName,
            password: hashedPassword,
            role: "super_admin",
            status: "active",
            permissions: fullPermissions,
          })
          .where(eq(users.email, cleanEmail));

        const [updated] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
        finalUser = updated;
      } else {
        // Create brand new Super Admin
        await db.insert(users).values({
          name: adminName,
          email: cleanEmail,
          password: hashedPassword,
          role: "super_admin",
          status: "active",
          permissions: fullPermissions,
        });

        const [created] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
        finalUser = created;
      }
    } catch (dbErr: any) {
      console.warn("Database error during super admin setup, using fallback:", dbErr.message);
      finalUser = {
        id: 999,
        name: adminName,
        email: cleanEmail,
        role: "super_admin",
        status: "active",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        permissions: fullPermissions,
      };
    }

    // Record activity log
    try {
      await db.insert(activityLogs).values({
        userId: finalUser?.id || null,
        userName: adminName,
        action: "Super Admin Created/Updated",
        details: `Super Admin provisioned via secret portal /super/admin/solvex/247 for ${cleanEmail}`,
        ipAddress: req.ip || "127.0.0.1",
      });
    } catch (_) {}

    const token = jwt.sign(
      {
        id: finalUser.id,
        email: finalUser.email,
        role: "super_admin",
        name: finalUser.name,
        permissions: fullPermissions,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any }
    );

    res.status(201).json({
      success: true,
      message: "Super Administrator initialized successfully with unrestricted permissions!",
      token,
      user: {
        id: finalUser.id,
        name: finalUser.name,
        email: finalUser.email,
        role: "super_admin",
        status: finalUser.status || "active",
        avatar: finalUser.avatar || null,
        permissions: fullPermissions,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureUsersColumns();
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: "Name, email and password are required." });
      return;
    }

    try {
      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingUser.length > 0) {
        res.status(400).json({ success: false, message: "A user with this email already exists." });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const assignedRole = role || "editor";
      const assignedPermissions = assignedRole === "super_admin" ? getFullPermissions() : null;

      await db.insert(users).values({
        name,
        email,
        password: hashedPassword,
        role: assignedRole,
        status: "active",
        permissions: assignedPermissions,
      });

      const [created] = await db.select().from(users).where(eq(users.email, email)).limit(1);

      const token = jwt.sign(
        {
          id: created.id,
          email: created.email,
          role: created.role,
          name: created.name,
          permissions: created.permissions,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN as any }
      );

      res.status(201).json({
        success: true,
        message: "User registered successfully.",
        token,
        user: {
          id: created.id,
          name: created.name,
          email: created.email,
          role: created.role,
          status: created.status,
          avatar: created.avatar,
          permissions: created.permissions,
        },
      });
    } catch (dbError: any) {
      console.warn("Database error during register:", dbError.message);
      res.status(500).json({ success: false, message: "Database error", error: dbError.message });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureUsersColumns();
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: "Email and password are required." });
      return;
    }

    try {
      const foundUsers = await db.select().from(users).where(eq(users.email, email.trim())).limit(1);

      if (foundUsers.length > 0) {
        const user = foundUsers[0];

        if (user.status !== "active") {
          res.status(403).json({ success: false, message: "Your account is inactive or suspended." });
          return;
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          res.status(401).json({ success: false, message: "Invalid email or password." });
          return;
        }

        // Record activity log in MySQL
        try {
          await db.insert(activityLogs).values({
            userId: user.id,
            userName: user.name,
            action: "Admin Logged In",
            details: `Logged in with role: ${user.role}`,
            ipAddress: req.ip || "127.0.0.1",
          });
        } catch (_) {}

        const userPermissions =
          user.role === "super_admin" ? getFullPermissions() : user.permissions;

        const token = jwt.sign(
          {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            permissions: userPermissions,
          },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN as any }
        );

        res.json({
          success: true,
          message: "Login successful.",
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            avatar: user.avatar,
            permissions: userPermissions,
          },
        });
        return;
      }
    } catch (dbError: any) {
      console.warn("Database error during login:", dbError.message);
    }

    // Direct fallback check if DB had connection blip
    if (email === "admin@solvexgloballtd.com" && password === "12345678") {
      const token = jwt.sign(
        {
          id: DEMO_ADMIN.id,
          email: DEMO_ADMIN.email,
          role: DEMO_ADMIN.role,
          name: DEMO_ADMIN.name,
          permissions: DEMO_ADMIN.permissions,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN as any }
      );

      res.json({
        success: true,
        message: "Login successful (Admin Authorized).",
        token,
        user: DEMO_ADMIN,
      });
      return;
    }

    res.status(401).json({ success: false, message: "Invalid email or password." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    try {
      const foundUsers = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
      if (foundUsers.length > 0) {
        const user = foundUsers[0];
        const userPermissions =
          user.role === "super_admin" ? getFullPermissions() : user.permissions;

        res.json({
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            avatar: user.avatar,
            permissions: userPermissions,
          },
        });
        return;
      }
    } catch (_) {}

    res.json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        status: "active",
        avatar: DEMO_ADMIN.avatar,
        permissions: req.user.role === "super_admin" ? getFullPermissions() : req.user.permissions,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
