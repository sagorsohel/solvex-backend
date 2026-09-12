import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { boardMembers, activityLogs } from "../db/schema.js";
import { asc, eq } from "drizzle-orm";

export const getBoardMembers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const list = await db
      .select({
        id: boardMembers.id,
        name: boardMembers.name,
        designation: boardMembers.designation,
        tag: boardMembers.tag,
        image: boardMembers.image,
        bio: boardMembers.bio,
        display_in_website: boardMembers.displayInWebsite,
        order_index: boardMembers.orderIndex,
        created_at: boardMembers.createdAt,
        updated_at: boardMembers.updatedAt,
      })
      .from(boardMembers)
      .orderBy(asc(boardMembers.orderIndex), asc(boardMembers.id));

    res.json({
      status: "success",
      message: "Board members retrieved successfully.",
      data: list,
    });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to fetch board members", error: error.message });
  }
};

export const createBoardMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, designation, tag, image, bio, display_in_website, order_index } = req.body;

    if (!name || !designation) {
      res.status(400).json({ status: "error", message: "Name and designation are required." });
      return;
    }

    await db.insert(boardMembers).values({
      name,
      designation,
      tag: tag || null,
      image: image || null,
      bio: bio || null,
      displayInWebsite: display_in_website !== undefined ? Boolean(display_in_website) : true,
      orderIndex: Number(order_index) || 0,
    });

    try {
      await db.insert(activityLogs).values({
        userId: req.user?.id || 1,
        userName: req.user?.name || "Admin",
        action: `Added Board Member: ${name}`,
        details: `Designation: ${designation}`,
        ipAddress: req.ip || "127.0.0.1",
      });
    } catch (_) {}

    res.status(201).json({ status: "success", message: "Board member created successfully." });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to create board member", error: error.message });
  }
};

export const updateBoardMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, designation, tag, image, bio, display_in_website, order_index } = req.body;

    await db
      .update(boardMembers)
      .set({
        name: name !== undefined ? name : undefined,
        designation: designation !== undefined ? designation : undefined,
        tag: tag !== undefined ? tag : undefined,
        image: image !== undefined ? image : undefined,
        bio: bio !== undefined ? bio : undefined,
        displayInWebsite: display_in_website !== undefined ? Boolean(display_in_website) : undefined,
        orderIndex: order_index !== undefined ? Number(order_index) : undefined,
      })
      .where(eq(boardMembers.id, Number(id)));

    res.json({ status: "success", message: "Board member updated successfully." });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to update board member", error: error.message });
  }
};

export const deleteBoardMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await db.delete(boardMembers).where(eq(boardMembers.id, Number(id)));
    res.json({ status: "success", message: "Board member deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to delete board member", error: error.message });
  }
};
