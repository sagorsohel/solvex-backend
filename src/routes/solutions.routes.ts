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
 * GET /api/testimonials
 * Client testimonials retrieved from homepage settings or database
 */
router.get("/testimonials", async (_req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query("SELECT testimonial_section FROM homepage_settings LIMIT 1");
    let testData: any[] = [];

    if (rows && rows.length > 0 && rows[0].testimonial_section) {
      const raw = rows[0].testimonial_section;
      testData = typeof raw === "string" ? JSON.parse(raw) : raw;
    }

    if (!Array.isArray(testData) || testData.length === 0) {
      testData = [
        {
          id: 1,
          name: "Ahmed Kabir",
          company: "Apex Spinning & Weaving Mills",
          role: "Director of Plant Operations",
          content: "Solvex deployed our 1.2MW rooftop solar array with absolute precision. Our daytime diesel generator run-time dropped by 75%, and the ROI has exceeded all initial projections.",
          avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
          rating: 5,
        },
        {
          id: 2,
          name: "Engr. Farhana Chowdhury",
          company: "CareMed Specialist Hospital",
          role: "Chief Medical Systems Engineer",
          content: "The pure sine wave medical UPS and BESS setup engineered by Solvex gives our operating theaters 100% reliable power continuity with zero transfer glitch.",
          avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200",
          rating: 5,
        },
      ];
    }

    const formatted = testData.map((t: any, idx: number) => ({
      id: t.id || idx + 1,
      stars: t.rating || t.stars || 5,
      quote: t.content || t.quote || "",
      avatar: t.avatar || "",
      name: t.name || "",
      designation_and_company: t.role ? `${t.role}, ${t.company}` : (t.company || t.designation_and_company || ""),
      display_in_website: true,
    }));

    return res.json({
      status: "success",
      data: formatted,
    });
  } catch (err: any) {
    return res.json({ status: "success", data: [] });
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
