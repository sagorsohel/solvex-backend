import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { products, inquiries, activityLogs } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";

export const getProducts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const list = await db.select().from(products).orderBy(desc(products.createdAt));
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch products", error: error.message });
  }
};

export const createProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, category, price, stock, status, description, image } = req.body;

    if (!title || !category) {
      res.status(400).json({ success: false, message: "Title and Category are required." });
      return;
    }

    await db.insert(products).values({
      title,
      category,
      price: price ? price.toString() : "0.00",
      stock: Number(stock) || 0,
      status: status || "published",
      description: description || null,
      image: image || null,
    });

    try {
      await db.insert(activityLogs).values({
        userId: req.user?.id || 1,
        userName: req.user?.name || "Admin",
        action: `Added Product: ${title}`,
        details: `Category: ${category}, Stock: ${stock}`,
        ipAddress: req.ip || "127.0.0.1",
      });
    } catch (_) {}

    res.status(201).json({ success: true, message: "Product created successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to create product", error: error.message });
  }
};

export const updateProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, category, price, stock, status, description, image } = req.body;

    await db
      .update(products)
      .set({
        ...(title && { title }),
        ...(category && { category }),
        ...(price !== undefined && { price: price.toString() }),
        ...(stock !== undefined && { stock: Number(stock) }),
        ...(status && { status }),
        ...(description !== undefined && { description }),
        ...(image !== undefined && { image }),
      })
      .where(eq(products.id, Number(id)));

    res.json({ success: true, message: "Product updated successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to update product", error: error.message });
  }
};

export const deleteProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await db.delete(products).where(eq(products.id, Number(id)));
    res.json({ success: true, message: "Product removed from catalog." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to delete product", error: error.message });
  }
};

export const getInquiries = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const list = await db.select().from(inquiries).orderBy(desc(inquiries.createdAt));
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch inquiries", error: error.message });
  }
};
