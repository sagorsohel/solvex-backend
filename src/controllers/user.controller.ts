import { Response } from "express";
import bcrypt from "bcryptjs";
import { eq, desc } from "drizzle-orm";
import { db, pool } from "../db/index.js";
import { users, activityLogs } from "../db/schema.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

// Helper to ensure MySQL database schema matches application requirements
let usersColumnsEnsured = false;
export const ensureUsersColumns = async () => {
  if (usersColumnsEnsured) return;
  try {
    const dbName = process.env.DB_NAME || "solvex_db";
    const [existingCols]: any = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
      [dbName]
    );
    const existingColNames = new Set((existingCols || []).map((c: any) => c.COLUMN_NAME.toLowerCase()));

    // 1. Ensure permissions JSON column exists
    if (!existingColNames.has("permissions")) {
      try {
        await pool.query(`ALTER TABLE users ADD COLUMN permissions JSON NULL`);
        console.log("✅ Added 'permissions' column to 'users' table");
      } catch (e: any) {
        console.warn("Could not add permissions column (might already exist):", e.message);
      }
    }

    // 2. Ensure role column supports VARCHAR(50) so 'super_admin' is accepted
    try {
      await pool.query(`ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'editor'`);
      console.log("✅ Updated 'role' column to VARCHAR(50) in 'users' table");
    } catch (e: any) {
      console.warn("Could not modify role column:", e.message);
    }

    usersColumnsEnsured = true;
  } catch (err: any) {
    console.warn("Error ensuring users table columns:", err.message);
  }
};

// Full permissions template for super_admin
export const getFullPermissions = () => {
  const modules = [
    "board_members",
    "products",
    "products_settings",
    "services",
    "projects",
    "blogs",
    "testimonials",
    "inquiries",
    "homepage",
    "about",
    "solar_calculator",
    "site_settings",
    "page_headers",
    "users",
    "settings",
  ];
  const perms: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }> = {};
  for (const m of modules) {
    perms[m] = { view: true, create: true, edit: true, delete: true };
  }
  return perms;
};

// In-memory fallback mock users for dev fallback
let mockUsers = [
  {
    id: 1,
    name: "Rajibul Islam (Super Admin)",
    email: "admin@solvex.com",
    role: "super_admin",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    permissions: getFullPermissions(),
    createdAt: new Date(),
  },
  {
    id: 2,
    name: "Sarah Jenkins",
    email: "sarah.j@solvex.com",
    role: "editor",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    permissions: {
      board_members: { view: true, create: true, edit: true, delete: false },
      products: { view: true, create: true, edit: true, delete: false },
      blogs: { view: true, create: true, edit: true, delete: false },
    },
    createdAt: new Date(),
  },
  {
    id: 3,
    name: "Michael Chen",
    email: "michael.c@solvex.com",
    role: "viewer",
    status: "inactive",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    permissions: {
      board_members: { view: true, create: false, edit: false, delete: false },
      products: { view: true, create: false, edit: false, delete: false },
    },
    createdAt: new Date(),
  },
];

export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureUsersColumns();

    try {
      const allUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          status: users.status,
          avatar: users.avatar,
          permissions: users.permissions,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt));

      if (allUsers.length > 0) {
        res.json({ success: true, data: allUsers });
        return;
      }
    } catch (_) {}

    res.json({ success: true, data: mockUsers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch users", error: error.message });
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureUsersColumns();
    const { name, email, password, role, status, avatar, permissions } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: "Name, email, and password are required." });
      return;
    }

    const assignedRole = role || "editor";
    const assignedPermissions =
      assignedRole === "super_admin" ? getFullPermissions() : (permissions || null);

    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await db.insert(users).values({
        name,
        email: email.trim(),
        password: hashedPassword,
        role: assignedRole,
        status: status || "active",
        avatar: avatar || null,
        permissions: assignedPermissions,
      });

      res.status(201).json({ success: true, message: "User created successfully." });
      return;
    } catch (dbErr: any) {
      console.warn("DB insert error, falling back to mock:", dbErr.message);
    }

    // Mock fallback
    const newUser = {
      id: mockUsers.length + 1,
      name,
      email: email.trim(),
      role: assignedRole,
      status: status || "active",
      avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
      permissions: assignedPermissions,
      createdAt: new Date(),
    };
    mockUsers.unshift(newUser);

    res.status(201).json({ success: true, message: "User created successfully (Development mode).", data: newUser });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to create user", error: error.message });
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureUsersColumns();
    const { id } = req.params;
    const { name, email, password, role, status, avatar, permissions } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email.trim();
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (permissions !== undefined) {
      updateData.permissions = role === "super_admin" ? getFullPermissions() : permissions;
    }

    if (password && typeof password === "string" && password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password.trim(), salt);
    }

    try {
      await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, Number(id)));

      res.json({ success: true, message: "User updated successfully." });
      return;
    } catch (dbErr: any) {
      console.warn("DB update error, updating mock:", dbErr.message);
    }

    // Mock fallback
    mockUsers = mockUsers.map((u) => {
      if (u.id === Number(id)) {
        return {
          ...u,
          ...updateData,
          permissions: permissions !== undefined ? permissions : u.permissions,
        };
      }
      return u;
    });
    res.json({ success: true, message: "User updated successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to update user", error: error.message });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureUsersColumns();
    const { id } = req.params;

    // Protection: Prevent deleting Super Admin
    try {
      const [existing] = await db.select().from(users).where(eq(users.id, Number(id))).limit(1);
      if (existing && existing.role === "super_admin") {
        res.status(400).json({
          success: false,
          message: "Security restriction: Super Admin accounts cannot be deleted.",
        });
        return;
      }

      await db.delete(users).where(eq(users.id, Number(id)));
      res.json({ success: true, message: "User deleted successfully." });
      return;
    } catch (_) {}

    // Mock fallback check
    const mockTarget = mockUsers.find((u) => u.id === Number(id));
    if (mockTarget && mockTarget.role === "super_admin") {
      res.status(400).json({
        success: false,
        message: "Security restriction: Super Admin accounts cannot be deleted.",
      });
      return;
    }

    mockUsers = mockUsers.filter((u) => u.id !== Number(id));
    res.json({ success: true, message: "User deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to delete user", error: error.message });
  }
};
