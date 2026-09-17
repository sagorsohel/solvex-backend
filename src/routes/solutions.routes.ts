import { Router, Request, Response } from "express";
import { pool } from "../db/index.js";

const router = Router();

/**
 * GET /api/solutions
 * Dynamic solutions list mapped from services & engineering solutions
 */
router.get("/solutions", async (_req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      "SELECT * FROM services WHERE status = 'published' ORDER BY order_index ASC"
    );

    const solutions = (rows || []).map((row: any) => {
      const tags = typeof row.tags === "string" ? JSON.parse(row.tags) : row.tags;
      const cards = typeof row.cards === "string" ? JSON.parse(row.cards) : row.cards;
      const faqs = typeof row.faqs === "string" ? JSON.parse(row.faqs) : row.faqs;
      const hardware = typeof row.hardware_card === "string" ? JSON.parse(row.hardware_card) : row.hardware_card;
      const consultation = typeof row.consultation_card === "string" ? JSON.parse(row.consultation_card) : row.consultation_card;
      const firstTag = Array.isArray(tags) && tags.length > 0 ? tags[0] : "Solar & Energy Solutions";

      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.short_description,
        label: firstTag,
        tag: firstTag,
        category: {
          id: 1,
          category: firstTag,
          show_in_website: true,
        },
        cards: cards || [],
        questions: faqs || [],
        core_hardware_card_title: hardware?.title || null,
        core_hardware_card_description: hardware?.description || null,
        consultation_card_title: consultation?.title || null,
        consultation_card_description: consultation?.description || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    return res.json({
      status: "success",
      message: "Solutions retrieved successfully",
      data: solutions,
    });
  } catch (err: any) {
    console.error("Error fetching solutions:", err);
    return res.json({ status: "success", data: [] });
  }
});

/**
 * GET /api/solutions/:id
 * Single solution by numeric ID or slug
 */
router.get("/solutions/:id", async (req: Request, res: Response) => {
  try {
    const idOrSlug = req.params.id;
    const [rows]: any = await pool.query(
      "SELECT * FROM services WHERE id = ? OR slug = ? LIMIT 1",
      [idOrSlug, idOrSlug]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: "error", message: "Solution not found" });
    }

    const row = rows[0];
    const tags = typeof row.tags === "string" ? JSON.parse(row.tags) : row.tags;
    const cards = typeof row.cards === "string" ? JSON.parse(row.cards) : row.cards;
    const faqs = typeof row.faqs === "string" ? JSON.parse(row.faqs) : row.faqs;
    const hardware = typeof row.hardware_card === "string" ? JSON.parse(row.hardware_card) : row.hardware_card;
    const consultation = typeof row.consultation_card === "string" ? JSON.parse(row.consultation_card) : row.consultation_card;
    const firstTag = Array.isArray(tags) && tags.length > 0 ? tags[0] : "Solar & Energy Solutions";

    return res.json({
      status: "success",
      data: {
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.short_description,
        label: firstTag,
        tag: firstTag,
        category: {
          id: 1,
          category: firstTag,
          show_in_website: true,
        },
        cards: cards || [],
        questions: faqs || [],
        core_hardware_card_title: hardware?.title || null,
        core_hardware_card_description: hardware?.description || null,
        consultation_card_title: consultation?.title || null,
        consultation_card_description: consultation?.description || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ status: "error", message: err.message });
  }
});

/**
 * GET /api/solution-categories
 * Solution category filters
 */
router.get("/solution-categories", async (_req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query("SELECT DISTINCT tags FROM services WHERE status = 'published'");
    const categorySet = new Set<string>();

    for (const r of rows || []) {
      const tags = typeof r.tags === "string" ? JSON.parse(r.tags) : r.tags;
      if (Array.isArray(tags)) {
        tags.forEach((t) => {
          if (t && typeof t === "string") categorySet.add(t);
        });
      }
    }

    const list = Array.from(categorySet);
    const defaultCategories = ["Commercial Solar", "Industrial BESS", "High-Voltage Grid", "Medical Power Systems"];
    const merged = list.length > 0 ? list : defaultCategories;

    const data = merged.map((cat, idx) => ({
      id: idx + 1,
      category: cat,
      status: true,
      show_in_website: true,
    }));

    return res.json({
      status: "success",
      data,
    });
  } catch (err: any) {
    return res.json({
      status: "success",
      data: [
        { id: 1, category: "Commercial Solar", status: true, show_in_website: true },
        { id: 2, category: "Industrial BESS", status: true, show_in_website: true },
      ],
    });
  }
});

/**
 * POST /api/consultations
 * Consultation inquiries from footer or solutions consultation card
 */
router.post("/consultations", async (req: Request, res: Response) => {
  try {
    const { name, email, phone, message } = req.body || {};
    if (!name || !email) {
      return res.status(400).json({ status: "error", message: "Name and email are required." });
    }

    await pool.query(
      "INSERT INTO inquiries (name, email, phone, message, status) VALUES (?, ?, ?, ?, 'pending')",
      [name, email, phone || null, message || "Consultation Request"]
    );

    return res.status(201).json({
      status: "success",
      message: "Consultation request submitted successfully.",
    });
  } catch (err: any) {
    return res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;
