import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { db, pool } from "../db/index.js";
import { testimonials, activityLogs } from "../db/schema.js";

let tableInitialized = false;

// Ensure MySQL table exists and seed initial approved reviews if empty
export const ensureTestimonialsTable = async (): Promise<void> => {
  if (tableInitialized) return;

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS testimonials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(191) NOT NULL,
        company VARCHAR(191) NULL,
        role VARCHAR(191) NULL,
        content TEXT NOT NULL,
        rating INT NOT NULL DEFAULT 5,
        avatar VARCHAR(500) NULL,
        status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        order_index INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Check if table is empty, and seed default approved partner reviews
    const [existing]: any = await pool.query("SELECT id FROM testimonials LIMIT 1");
    if (!existing || existing.length === 0) {
      await pool.query(`
        INSERT INTO testimonials (name, company, role, content, rating, avatar, status, order_index) VALUES
        ('Ahmed Kabir', 'Apex Spinning & Weaving Mills', 'Director of Plant Operations', 'Solvex deployed our 1.2MW rooftop solar array with absolute precision. Our daytime diesel generator run-time dropped by 75%, and the ROI has exceeded all initial projections.', 5, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200', 'approved', 0),
        ('Dr. Marianne Weber', 'Nordic Clean Grid Infrastructure', 'Lead Environmental Engineer', 'Their utility battery energy storage system (BESS) stabilization engineering solved our intermittent offshore wind integration issues without a single day of grid curtailment.', 5, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200', 'approved', 1),
        ('Rafiqul Islam', 'Karnaphuli Energy Complex', 'Chief Technology Officer', 'Exceptional EPC engineering. From initial feasibility audits to final national grid synchronization, Solvex delivered beyond expectations with zero downtime.', 5, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200', 'approved', 2);
      `);
    }

    tableInitialized = true;
  } catch (err) {
    console.error("ensureTestimonialsTable Error:", err);
  }
};

/**
 * PUBLIC: Submit testimonial without logging in (login sara)
 * POST /api/testimonials
 */
export const submitPublicTestimonial = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureTestimonialsTable();

    const { name, company, role, content, rating, avatar } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: "Your name is required." });
      return;
    }

    if (!content || !content.trim()) {
      res.status(400).json({ success: false, message: "Review message is required." });
      return;
    }

    const cleanRating = Math.min(5, Math.max(1, Number(rating) || 5));

    const [result]: any = await pool.query(
      `INSERT INTO testimonials (name, company, role, content, rating, avatar, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [
        name.trim(),
        company?.trim() || null,
        role?.trim() || null,
        content.trim(),
        cleanRating,
        avatar?.trim() || null,
      ]
    );

    // Log admin activity notification
    try {
      await db.insert(activityLogs).values({
        userId: 1,
        userName: "Guest Visitor",
        action: "New Testimonial Submitted (Pending Review)",
        details: `From ${name.trim()} (${company?.trim() || "Independent"}), Rating: ${cleanRating}★`,
        ipAddress: req.ip || "127.0.0.1",
      });
    } catch (_) {}

    res.status(201).json({
      success: true,
      message: "Thank you! Your testimonial has been submitted successfully and will appear on the website once approved by our team.",
      data: {
        id: result.insertId,
        name: name.trim(),
        status: "pending",
      },
    });
  } catch (error: any) {
    console.error("submitPublicTestimonial Error:", error);
    res.status(500).json({ success: false, message: "Failed to submit testimonial", error: error.message });
  }
};

/**
 * PUBLIC: Fetch only APPROVED testimonials for the live website
 * GET /api/testimonials
 */
export const getPublicTestimonials = async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureTestimonialsTable();

    const [rows]: any = await pool.query(`
      SELECT 
        id, 
        name, 
        company, 
        role, 
        content, 
        content AS quote,
        rating, 
        rating AS stars,
        avatar, 
        order_index, 
        created_at
      FROM testimonials
      WHERE status = 'approved'
      ORDER BY order_index ASC, id DESC
    `);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    console.error("getPublicTestimonials Error:", error);
    res.status(500).json({ success: false, message: "Failed to load testimonials", error: error.message });
  }
};

/**
 * ADMIN: Get all testimonials with optional status filter & statistics
 * GET /api/testimonials/admin
 */
export const getAdminTestimonials = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureTestimonialsTable();

    const statusFilter = req.query.status as string | undefined;

    let query = "SELECT * FROM testimonials";
    const params: any[] = [];

    if (statusFilter && ["pending", "approved", "rejected"].includes(statusFilter)) {
      query += " WHERE status = ?";
      params.push(statusFilter);
    }

    query += " ORDER BY created_at DESC";

    const [rows]: any = await pool.query(query, params);

    // Calculate metric stats
    const [counts]: any = await pool.query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
      FROM testimonials
    `);

    const stats = counts[0] || { total: 0, pending: 0, approved: 0, rejected: 0 };

    res.json({
      success: true,
      data: rows,
      stats: {
        total: Number(stats.total) || 0,
        pending: Number(stats.pending) || 0,
        approved: Number(stats.approved) || 0,
        rejected: Number(stats.rejected) || 0,
      },
    });
  } catch (error: any) {
    console.error("getAdminTestimonials Error:", error);
    res.status(500).json({ success: false, message: "Failed to load admin testimonials", error: error.message });
  }
};

/**
 * ADMIN: Update testimonial status (Approve / Reject / Pending)
 * PUT /api/testimonials/admin/:id/status
 */
export const updateTestimonialStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureTestimonialsTable();

    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "approved", "rejected"].includes(status)) {
      res.status(400).json({ success: false, message: "Invalid status. Must be 'pending', 'approved', or 'rejected'." });
      return;
    }

    const [result]: any = await pool.query(
      "UPDATE testimonials SET status = ?, updated_at = NOW() WHERE id = ?",
      [status, Number(id)]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, message: "Testimonial not found" });
      return;
    }

    // Log admin activity
    try {
      await db.insert(activityLogs).values({
        userId: req.user?.id || 1,
        userName: req.user?.name || "Admin",
        action: `Testimonial #${id} Status Changed`,
        details: `Updated status to: ${status.toUpperCase()}`,
        ipAddress: req.ip || "127.0.0.1",
      });
    } catch (_) {}

    res.json({
      success: true,
      message: `Testimonial status updated to ${status}.`,
    });
  } catch (error: any) {
    console.error("updateTestimonialStatus Error:", error);
    res.status(500).json({ success: false, message: "Failed to update testimonial status", error: error.message });
  }
};

/**
 * ADMIN: Edit full testimonial details
 * PUT /api/testimonials/admin/:id
 */
export const updateTestimonial = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureTestimonialsTable();

    const { id } = req.params;
    const { name, company, role, content, rating, avatar, status, order_index } = req.body;

    const [result]: any = await pool.query(
      `UPDATE testimonials SET 
        name = COALESCE(?, name),
        company = ?,
        role = ?,
        content = COALESCE(?, content),
        rating = COALESCE(?, rating),
        avatar = ?,
        status = COALESCE(?, status),
        order_index = COALESCE(?, order_index),
        updated_at = NOW()
       WHERE id = ?`,
      [
        name?.trim() || null,
        company?.trim() || null,
        role?.trim() || null,
        content?.trim() || null,
        rating !== undefined ? Number(rating) : null,
        avatar?.trim() || null,
        status || null,
        order_index !== undefined ? Number(order_index) : null,
        Number(id),
      ]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, message: "Testimonial not found" });
      return;
    }

    res.json({
      success: true,
      message: "Testimonial updated successfully",
    });
  } catch (error: any) {
    console.error("updateTestimonial Error:", error);
    res.status(500).json({ success: false, message: "Failed to update testimonial", error: error.message });
  }
};

/**
 * ADMIN: Delete testimonial
 * DELETE /api/testimonials/admin/:id
 */
export const deleteTestimonial = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureTestimonialsTable();

    const { id } = req.params;

    const [result]: any = await pool.query("DELETE FROM testimonials WHERE id = ?", [Number(id)]);

    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, message: "Testimonial not found" });
      return;
    }

    // Log admin activity
    try {
      await db.insert(activityLogs).values({
        userId: req.user?.id || 1,
        userName: req.user?.name || "Admin",
        action: `Deleted Testimonial #${id}`,
        details: `Removed review from database`,
        ipAddress: req.ip || "127.0.0.1",
      });
    } catch (_) {}

    res.json({
      success: true,
      message: "Testimonial deleted successfully",
    });
  } catch (error: any) {
    console.error("deleteTestimonial Error:", error);
    res.status(500).json({ success: false, message: "Failed to delete testimonial", error: error.message });
  }
};
