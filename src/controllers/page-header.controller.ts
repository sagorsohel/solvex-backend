import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { db, pool } from "../db/index.js";
import { pageHeaders, activityLogs } from "../db/schema.js";
import { eq } from "drizzle-orm";

let tableInitialized = false;

export const defaultPageHeaders = [
  {
    page_key: "about",
    badge: "DISCOVER SOLVEX GLOBAL",
    title: "Engineering",
    highlight_text: "Sustainable",
    subtitle: "Infrastructure for Humanity",
    description: "Pioneering utility-scale solar generation, battery energy storage, and industrial energy resilience for the zero-carbon epoch.",
    background_image: "/clean_energy_hero_bg.jpg",
    translations: {
      bn: {
        badge: "আমাদের পরিচিতি",
        title: "টেকসই প্রকৌশল",
        highlight_text: "ইঞ্জিনিয়ারিং",
        subtitle: "মানবতার কল্যাণে অবকাঠামো",
        description: "জিরো-কার্বন যুগের জন্য ইউটিলিটি-স্কেল সোলার জেনারেশন, ব্যাটারি শক্তি সঞ্চয় এবং শিল্প জ্বালানি স্থিতিস্থাপকতা।",
      },
    },
  },
  {
    page_key: "services",
    badge: "ENGINEERING SOLUTIONS & EPC",
    title: "Comprehensive Renewable",
    highlight_text: "Energy Services",
    subtitle: "End-to-End Clean Tech Deployment",
    description: "From initial geotechnical and grid-interconnection studies to commercial operation and high-voltage substation commissioning.",
    background_image: "/clean_energy_hero_bg.jpg",
    translations: {
      bn: {
        badge: "ইঞ্জিনিয়ারিং সলিউশন ও ইপিসি",
        title: "ব্যাপক নবায়নযোগ্য",
        highlight_text: "জ্বালানি সেবা",
        subtitle: "প্রান্তিক পরিচ্ছন্ন প্রযুক্তি বাস্তবায়ন",
        description: "প্রাথমিক ভূতাত্ত্বিক এবং গ্রিড ইন্টারকানেকশন গবেষণা থেকে শুরু করে বাণিজ্যিক পরিচালনা এবং সাবস্টেশন কমিশনিং।",
      },
    },
  },
  {
    page_key: "projects",
    badge: "PORTFOLIO & CASE STUDIES",
    title: "Case Studies &",
    highlight_text: "Global Deployments",
    subtitle: "Proven Utility-Scale Projects",
    description: "Explore the structural engineering, battery storage synchronicity, and grid synchronization audits behind our active zero-emission projects.",
    background_image: "/clean_energy_hero_bg.jpg",
    translations: {
      bn: {
        badge: "পোর্টফোলিও ও কেস স্টাডিজ",
        title: "কেস স্টাডিজ এবং",
        highlight_text: "বৈশ্বিক প্রকল্প",
        subtitle: "প্রমাণিত ইউটিলিটি-স্কেল প্রকল্পসমূহ",
        description: "আমাদের সক্রিয় জিরো-কার্বন প্রকল্পগুলোর পেছনের স্ট্রাকচারাল ইঞ্জিনিয়ারিং এবং গ্রিড সিনক্রোনাইজেশন অডিট দেখুন।",
      },
    },
  },
  {
    page_key: "products",
    badge: "SOLVEX GLOBAL PRODUCT SHOWCASE",
    title: "Industrial Power, Inverters &",
    highlight_text: "Clean Energy Tech",
    subtitle: "Tier-1 Renewable Equipment Catalog",
    description: "Explore our Tier-1 solar energy systems, hybrid inverters, battery storage, and precision healthcare & clean-tech equipment.",
    background_image: "/clean_energy_hero_bg.jpg",
    translations: {
      bn: {
        badge: "সলভেক্স গ্লোবাল প্রোডাক্ট শোকেস",
        title: "শিল্প শক্তি, ইনভার্টার ও",
        highlight_text: "পরিচ্ছন্ন প্রযুক্তি",
        subtitle: "টায়ার-১ রিনিউয়েবল ইকুইপমেন্ট ক্যাটালগ",
        description: "আমাদের টায়ার-১ সোলার সিস্টেম, হাইব্রিড ইনভার্টার, ব্যাটারি স্টোরেজ ও আধুনিক টেকনোলজি সরঞ্জাম অন্বেষণ করুন।",
      },
    },
  },
  {
    page_key: "blogs",
    badge: "SOLVEX JOURNAL & INSIGHTS",
    title: "Insights & News on the",
    highlight_text: "Energy Transition",
    subtitle: "Technical Analysis & Field Research",
    description: "Read engineering breakdowns, clean tech breakthroughs, and renewable energy market analyses published by our technical specialists.",
    background_image: "/clean_energy_hero_bg.jpg",
    translations: {
      bn: {
        badge: "সলভেক্স জার্নাল ও ইনসাইটস",
        title: "শক্তি রূপান্তরের খবর ও",
        highlight_text: "প্রযুক্তিগত গবেষণা",
        subtitle: "টেকনিক্যাল বিশ্লেষণ ও ফিল্ড রিসার্চ",
        description: "আমাদের অভিজ্ঞ প্রকৌশলীদের রচিত সোলার টেকনোলজি, গ্রিড নীতিমালা এবং নবায়নযোগ্য জ্বালানির সর্বশেষ আপডেট ও বিশ্লেষণ পড়ুন।",
      },
    },
  },
  {
    page_key: "contact",
    badge: "GLOBAL REACH",
    title: "Connect With Our",
    highlight_text: "Global Offices",
    subtitle: "International Engineering Hubs",
    description: "Reach out to our international hubs. We provide regional technical site assessments, grid integration consultation, and dedicated post-installation support.",
    background_image: "/contact_hero.png",
    translations: {
      bn: {
        badge: "গ্লোবাল নেটওয়ার্ক",
        title: "যোগাযোগ করুন আমাদের",
        highlight_text: "বিশ্বব্যাপী কার্যালয়ে",
        subtitle: "আন্তর্জাতিক ইঞ্জিনিয়ারিং হাবসমূহ",
        description: "আমাদের আন্তর্জাতিক কার্যালয়গুলোতে যোগাযোগ করুন। আমরা আঞ্চলিক সাইট অ্যাসেসমেন্ট এবং কারিগরি পরামর্শ দিয়ে থাকি।",
      },
    },
  },
];

export const ensurePageHeadersTable = async () => {
  if (tableInitialized) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS page_headers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        page_key VARCHAR(100) NOT NULL UNIQUE,
        badge VARCHAR(191),
        title VARCHAR(255),
        highlight_text VARCHAR(191),
        subtitle VARCHAR(255),
        description TEXT,
        background_image VARCHAR(500),
        translations JSON,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure columns exist on older tables
    try {
      await pool.query(`ALTER TABLE services_page_settings ADD COLUMN hero_image VARCHAR(500) NULL`);
    } catch (_) {}
    try {
      await pool.query(`ALTER TABLE projects_page_settings ADD COLUMN background_image VARCHAR(500) NULL`);
    } catch (_) {}

    // Pre-seed default headers if not present
    for (const def of defaultPageHeaders) {
      const [existing]: any = await pool.query(
        `SELECT id FROM page_headers WHERE page_key = ? LIMIT 1`,
        [def.page_key]
      );
      if (!existing || existing.length === 0) {
        await pool.query(
          `INSERT INTO page_headers (
            page_key, badge, title, highlight_text, subtitle, description, background_image, translations
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            def.page_key,
            def.badge,
            def.title,
            def.highlight_text,
            def.subtitle,
            def.description,
            def.background_image,
            JSON.stringify(def.translations),
          ]
        );
      }
    }
    tableInitialized = true;
  } catch (err: any) {
    console.error("Error in ensurePageHeadersTable:", err.message);
  }
};

/**
 * GET /api/page-headers
 * Public endpoint to fetch all page headers as a dictionary and list
 */
export const getPageHeaders = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensurePageHeadersTable();

    const rows = await db.select().from(pageHeaders);
    const headersMap: Record<string, any> = {};
    for (const row of rows) {
      headersMap[row.pageKey] = row;
    }

    res.status(200).json({
      success: true,
      data: headersMap,
      list: rows,
    });
  } catch (error: any) {
    console.error("Error fetching page headers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch page headers",
      error: error.message,
    });
  }
};

/**
 * GET /api/page-headers/:pageKey
 * Public endpoint to fetch a single page header
 */
export const getPageHeaderByKey = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensurePageHeadersTable();
    const { pageKey } = req.params;

    const [header] = await db.select().from(pageHeaders).where(eq(pageHeaders.pageKey, pageKey)).limit(1);

    if (!header) {
      const defaultHeader = defaultPageHeaders.find((h) => h.page_key === pageKey);
      if (defaultHeader) {
        res.status(200).json({
          success: true,
          data: {
            pageKey: defaultHeader.page_key,
            badge: defaultHeader.badge,
            title: defaultHeader.title,
            highlightText: defaultHeader.highlight_text,
            subtitle: defaultHeader.subtitle,
            description: defaultHeader.description,
            backgroundImage: defaultHeader.background_image,
            translations: defaultHeader.translations,
          },
        });
        return;
      }

      res.status(404).json({
        success: false,
        message: `Page header for '${pageKey}' not found`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: header,
    });
  } catch (error: any) {
    console.error(`Error fetching page header for ${req.params.pageKey}:`, error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch page header",
      error: error.message,
    });
  }
};

/**
 * PUT /api/page-headers/:pageKey
 * Admin/Editor protected endpoint to update a page header
 */
export const updatePageHeader = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensurePageHeadersTable();
    const { pageKey } = req.params;
    const {
      badge,
      title,
      highlightText,
      highlight_text,
      subtitle,
      description,
      backgroundImage,
      background_image,
      translations,
    } = req.body;

    const finalHighlight = highlightText !== undefined ? highlightText : highlight_text;
    const finalBgImage = backgroundImage !== undefined ? backgroundImage : background_image;

    const [existing] = await db.select().from(pageHeaders).where(eq(pageHeaders.pageKey, pageKey)).limit(1);

    if (existing) {
      await db
        .update(pageHeaders)
        .set({
          badge: badge !== undefined ? badge : existing.badge,
          title: title !== undefined ? title : existing.title,
          highlightText: finalHighlight !== undefined ? finalHighlight : existing.highlightText,
          subtitle: subtitle !== undefined ? subtitle : existing.subtitle,
          description: description !== undefined ? description : existing.description,
          backgroundImage: finalBgImage !== undefined ? finalBgImage : existing.backgroundImage,
          translations: translations !== undefined ? translations : existing.translations,
        })
        .where(eq(pageHeaders.pageKey, pageKey));
    } else {
      await db.insert(pageHeaders).values({
        pageKey,
        badge: badge || null,
        title: title || null,
        highlightText: finalHighlight || null,
        subtitle: subtitle || null,
        description: description || null,
        backgroundImage: finalBgImage || null,
        translations: translations || null,
      });
    }

    // Sync with legacy servicesPageSettings or projectsPageSettings if applicable
    if (pageKey === "services") {
      try {
        await pool.query(
          `UPDATE services_page_settings SET hero_small_title = ?, hero_title = ?, hero_title_style = ?, hero_description = ?, hero_image = ? WHERE id = 1`,
          [badge || "", title || "", finalHighlight || "", description || "", finalBgImage || ""]
        );
      } catch (_) {}
    } else if (pageKey === "projects") {
      try {
        await pool.query(
          `UPDATE projects_page_settings SET badge = ?, title = ?, title_highlight = ?, description = ?, background_image = ? WHERE id = 1`,
          [badge || "", title || "", finalHighlight || "", description || "", finalBgImage || ""]
        );
      } catch (_) {}
    }

    const [updated] = await db.select().from(pageHeaders).where(eq(pageHeaders.pageKey, pageKey)).limit(1);

    // Log Activity
    try {
      if (req.user?.id) {
        await db.insert(activityLogs).values({
          userId: req.user.id,
          userName: req.user.name || "Admin",
          action: "UPDATE_PAGE_HEADER",
          details: `Updated header for page: ${pageKey}`,
          ipAddress: req.ip || "127.0.0.1",
        });
      }
    } catch (_) {}

    res.status(200).json({
      success: true,
      message: `Page header for '${pageKey}' updated successfully`,
      data: updated,
    });
  } catch (error: any) {
    console.error(`Error updating page header for ${req.params.pageKey}:`, error);
    res.status(500).json({
      success: false,
      message: "Failed to update page header",
      error: error.message,
    });
  }
};
