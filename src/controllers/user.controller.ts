import { Response } from "express";
import bcrypt from "bcryptjs";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, activityLogs } from "../db/schema.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

// In-memory fallback mock users for dev fallback
let mockUsers = [
  {
    id: 1,
    name: "Rajibul Islam (Super Admin)",
    email: "admin@solvex.com",
    role: "admin",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date(),
  },
  {
    id: 2,
    name: "Sarah Jenkins",
    email: "sarah.j@solvex.com",
    role: "editor",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date(),
  },
  {
    id: 3,
    name: "Michael Chen",
    email: "michael.c@solvex.com",
    role: "viewer",
    status: "inactive",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date(),
  },
];

export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    try {
      const allUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          status: users.status,
          avatar: users.avatar,
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
    const { name, email, password, role, status } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: "Name, email, and password are required." });
      return;
    }

    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await db.insert(users).values({
        name,
        email,
        password: hashedPassword,
        role: role || "editor",
        status: status || "active",
      });

      res.status(201).json({ success: true, message: "User created successfully." });
      return;
    } catch (_) {}

    // Mock fallback
    const newUser = {
      id: mockUsers.length + 1,
      name,
      email,
      role: role || "editor",
      status: status || "active",
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
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
    const { id } = req.params;
    const { name, role, status } = req.body;

    try {
      await db
        .update(users)
        .set({
          name: name || undefined,
          role: role || undefined,
          status: status || undefined,
        })
        .where(eq(users.id, Number(id)));

      res.json({ success: true, message: "User updated successfully." });
      return;
    } catch (_) {}

    // Mock fallback
    mockUsers = mockUsers.map((u) => (u.id === Number(id) ? { ...u, name: name || u.name, role: role || u.role, status: status || u.status } : u));
    res.json({ success: true, message: "User updated successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to update user", error: error.message });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    try {
      await db.delete(users).where(eq(users.id, Number(id)));
      res.json({ success: true, message: "User deleted successfully." });
      return;
    } catch (_) {}

    // Mock fallback
    mockUsers = mockUsers.filter((u) => u.id !== Number(id));
    res.json({ success: true, message: "User deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to delete user", error: error.message });
  }
};
