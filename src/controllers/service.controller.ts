import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { db, pool } from "../db/index.js";
import { services, servicesPageSettings, activityLogs } from "../db/schema.js";
import { asc, eq, or } from "drizzle-orm";

let tablesInitialized = false;

// Ensure tables exist and seed initial demo service if empty
export const ensureServicesTables = async () => {
  if (tablesInitialized) return;
  try {
    // 1. Create services table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(191) NOT NULL UNIQUE,
        title VARCHAR(191) NOT NULL,
        short_description TEXT,
        tags JSON,
        hero_image VARCHAR(500),
        cards JSON,
        hardware_card JSON,
        consultation_card JSON,
        faqs JSON,
        status ENUM('published', 'draft') DEFAULT 'published' NOT NULL,
        order_index INT DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await pool.query(`ALTER TABLE services ADD COLUMN translations JSON NULL`);
    } catch (_) {}

    // 2. Create services_page_settings table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS services_page_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hero_small_title VARCHAR(191),
        hero_title VARCHAR(191),
        hero_title_style VARCHAR(191),
        hero_description TEXT,
        highlights JSON,
        section_title VARCHAR(191),
        section_subtitle TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Seed services_page_settings if empty
    const [settingsRows]: any = await pool.query(`SELECT id FROM services_page_settings LIMIT 1`);
    if (!settingsRows || settingsRows.length === 0) {
      await pool.query(`
        INSERT INTO services_page_settings (
          hero_small_title, hero_title, hero_title_style, hero_description,
          highlights, section_title, section_subtitle
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?
        )
      `, [
        "Our Engineering Services",
        "Comprehensive Energy &",
        "Technology Solutions",
        "Delivering state-of-the-art solar panel installations, high-capacity battery storage systems, wind turbines, and microgrid technology integration.",
        JSON.stringify([
          "99% Peak Conversion Efficiency",
          "Tier 1 Guaranteed Hardware",
          "Certified EPC Engineering"
        ]),
        "End-to-End Clean Energy Capabilities",
        "Engineered for maximum reliability, bankability, and carbon reduction across industrial, utility, and commercial applications."
      ]);
    }

    // 4. Seed C&I Turnkey Solar PV Systems if services table is empty
    const [serviceRows]: any = await pool.query(`SELECT id FROM services LIMIT 1`);
    if (!serviceRows || serviceRows.length === 0) {
      const defaultCards = [
        {
          id: "card-1",
          phase_tag: "PHASE 01 SYSTEM ARCHITECTURE",
          title: "Structural Engineering & Aerodynamic Design",
          description: "Engineered for maximum resilience and high yield in heavy industrial environments.",
          bullet_points: [
            "Custom ballast and non-penetrating aluminum mounting for tin, RCC, and standing-seam roofs designed to withstand 180 km/h wind speeds.",
            "Full 3D shadow analysis and thermal modeling to ensure peak kilowatt-hour generation year-round."
          ],
          image: "https://images.unsplash.com/photo-1508873696983-2df5293cb395?w=800&auto=format&fit=crop&q=80"
        },
        {
          id: "card-2",
          phase_tag: "PHASE 02 SYSTEM ARCHITECTURE",
          title: "Tier-1 High-Efficiency Bifacial Modules",
          description: "State-of-the-art TOPCon and heterojunction cell technology delivering ultra-low degradation.",
          bullet_points: [
            "Deployment of N-Type TOPCon and heterojunction bifacial panels with up to 23.5% module efficiency and 30-year linear performance warranty.",
            "Integrated with smart multi-MPPT string inverters providing up to 99.0% Euro efficiency and AFCI arc-fault protection."
          ],
          image: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80"
        }
      ];

      const defaultHardware = {
        title: "Industrial Solar PV Package",
        description: "Tier-1 TOPCon Bifacial Panels, High-Efficiency Multi-MPPT String Inverters, and Weather-Proof SCADA Combiner Boxes.",
        button_text: "VIEW TECHNICAL SPECIFICATIONS",
        button_color: "#10B981",
        card_color: "#0F172A"
      };

      const defaultConsultation = {
        title: "Request Rooftop Feasibility Study",
        description: "Our certified design engineers provide complimentary structural shadow analysis and electrical load auditing free of charge.",
        button_text: "BOOK FREE SITE AUDIT",
        button_color: "#F59E0B",
        card_color: "#047857"
      };

      const defaultFaqs = [
        {
          question: "How much factory roof space is required per megawatt (1 MWp)?",
          answer: "With modern 580W-700W N-Type TOPCon modules, approximately 60,000 to 75,000 square feet of unobstructed roof space is required per 1 MWp installation."
        },
        {
          question: "What is the typical payback period for a commercial solar project?",
          answer: "In most industrial manufacturing facilities, net-metered rooftop solar achieves full capital payback within 3.5 to 5 years against volatile national grid tariffs."
        },
        {
          question: "Can our factory operate on solar during national grid outages?",
          answer: "Yes, by integrating microgrid controllers and battery energy storage (BESS), solar PV seamlessly transitions into zero-interruption islanding mode."
        }
      ];

      await pool.query(`
        INSERT INTO services (
          slug, title, short_description, tags, cards, hardware_card, consultation_card, faqs, status, order_index
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        "ci-turnkey-solar-pv-systems",
        "C&I Turnkey Solar PV Systems",
        "Comprehensive EPC solutions designed for factories, textile mills, warehouses, and commercial establishments. Engineered for high yield, structural integrity, and maximum net-metering benefits.",
        JSON.stringify(["COMMERCIAL & INDUSTRIAL SOLAR (C&I)", "COMMERCIAL & INDUSTRIAL"]),
        JSON.stringify(defaultCards),
        JSON.stringify(defaultHardware),
        JSON.stringify(defaultConsultation),
        JSON.stringify(defaultFaqs),
        "published",
        1
      ]);
    }

    tablesInitialized = true;
  } catch (error) {
    console.error("Error ensuring services tables:", error);
  }
};

// 1. GET /api/services-page
export const getServicesPageSettings = async (_req: Request, res: Response): Promise<void> => {
  await ensureServicesTables();
  try {
    const list = await db.select().from(servicesPageSettings).limit(1);
    if (list.length > 0) {
      const s = list[0];
      res.json({
        status: "success",
        message: "Services page settings retrieved.",
        data: {
          id: s.id,
          hero_small_title: s.heroSmallTitle,
          hero_title: s.heroTitle,
          hero_title_style: s.heroTitleStyle,
          hero_description: s.heroDescription,
          highlights: s.highlights || [],
          section_title: s.sectionTitle,
          section_subtitle: s.sectionSubtitle,
          updated_at: s.updatedAt,
        },
      });
      return;
    }
    res.status(404).json({ status: "error", message: "Services page settings not found." });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to fetch services page settings", error: error.message });
  }
};

// 2. PUT /api/services-page
export const updateServicesPageSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await ensureServicesTables();
  try {
    const {
      hero_small_title,
      hero_title,
      hero_title_style,
      hero_description,
      highlights,
      section_title,
      section_subtitle,
    } = req.body;

    const existing = await db.select().from(servicesPageSettings).limit(1);

    if (existing.length > 0) {
      await db
        .update(servicesPageSettings)
        .set({
          heroSmallTitle: hero_small_title !== undefined ? hero_small_title : existing[0].heroSmallTitle,
          heroTitle: hero_title !== undefined ? hero_title : existing[0].heroTitle,
          heroTitleStyle: hero_title_style !== undefined ? hero_title_style : existing[0].heroTitleStyle,
          heroDescription: hero_description !== undefined ? hero_description : existing[0].heroDescription,
          highlights: highlights !== undefined ? highlights : existing[0].highlights,
          sectionTitle: section_title !== undefined ? section_title : existing[0].sectionTitle,
          sectionSubtitle: section_subtitle !== undefined ? section_subtitle : existing[0].sectionSubtitle,
        })
        .where(eq(servicesPageSettings.id, existing[0].id));
    } else {
      await db.insert(servicesPageSettings).values({
        heroSmallTitle: hero_small_title,
        heroTitle: hero_title,
        heroTitleStyle: hero_title_style,
        heroDescription: hero_description,
        highlights: highlights || [],
        sectionTitle: section_title,
        sectionSubtitle: section_subtitle,
      });
    }

    res.json({
      status: "success",
      message: "Services page settings updated successfully.",
    });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to update services page settings", error: error.message });
  }
};

// 3. GET /api/services (List all services)
export const getServices = async (req: Request, res: Response): Promise<void> => {
  await ensureServicesTables();
  try {
    const list = await db
      .select()
      .from(services)
      .orderBy(asc(services.orderIndex), asc(services.id));

    const mapped = list.map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      short_description: s.shortDescription,
      tags: s.tags || [],
      hero_image: s.heroImage,
      cards: s.cards || [],
      hardware_card: s.hardwareCard,
      consultation_card: s.consultationCard,
      faqs: s.faqs || [],
      status: s.status,
      order_index: s.orderIndex,
      translations: s.translations || {},
      created_at: s.createdAt,
      updated_at: s.updatedAt,
    }));

    res.json({
      status: "success",
      message: "Services retrieved successfully.",
      data: mapped,
    });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to fetch services", error: error.message });
  }
};

// 4. GET /api/services/:slug (Single service by slug or id)
export const getServiceBySlug = async (req: Request, res: Response): Promise<void> => {
  await ensureServicesTables();
  try {
    const param = req.params.slug;
    const isNum = !isNaN(Number(param));

    let condition = eq(services.slug, param);
    if (isNum) {
      condition = or(eq(services.slug, param), eq(services.id, Number(param))) as any;
    }

    const found = await db.select().from(services).where(condition).limit(1);

    if (found.length > 0) {
      const s = found[0];
      res.json({
        status: "success",
        message: "Service retrieved successfully.",
        data: {
          id: s.id,
          slug: s.slug,
          title: s.title,
          short_description: s.shortDescription,
          tags: s.tags || [],
          hero_image: s.heroImage,
          cards: s.cards || [],
          hardware_card: s.hardwareCard,
          consultation_card: s.consultationCard,
          faqs: s.faqs || [],
          status: s.status,
          order_index: s.orderIndex,
          translations: s.translations || {},
          created_at: s.createdAt,
          updated_at: s.updatedAt,
        },
      });
      return;
    }

    res.status(404).json({ status: "error", message: "Service not found." });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to fetch single service", error: error.message });
  }
};

// Helper to generate a clean URL slug
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
};

// 5. POST /api/services (Create a new service)
export const createService = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await ensureServicesTables();
  try {
    const {
      title,
      slug,
      short_description,
      tags,
      hero_image,
      cards,
      hardware_card,
      consultation_card,
      faqs,
      status,
      order_index,
      translations,
    } = req.body;

    if (!title) {
      res.status(400).json({ status: "error", message: "Service title is required." });
      return;
    }

    const generatedSlug = slugify(slug || title);

    await db.insert(services).values({
      title,
      slug: generatedSlug,
      shortDescription: short_description || null,
      tags: Array.isArray(tags) ? tags : [],
      heroImage: hero_image || null,
      cards: Array.isArray(cards) ? cards : [],
      hardwareCard: hardware_card || null,
      consultationCard: consultation_card || null,
      faqs: Array.isArray(faqs) ? faqs : [],
      status: status === "draft" ? "draft" : "published",
      orderIndex: Number(order_index) || 0,
      translations: translations || null,
    });

    try {
      await db.insert(activityLogs).values({
        userId: req.user?.id || 1,
        userName: req.user?.name || "Admin",
        action: `Created Service: ${title}`,
        details: `Slug: ${generatedSlug}`,
        ipAddress: req.ip || "127.0.0.1",
      });
    } catch (_) {}

    res.json({
      status: "success",
      message: "Service created successfully.",
    });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to create service", error: error.message });
  }
};

// 6. PUT /api/services/:id (Update service)
export const updateService = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await ensureServicesTables();
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ status: "error", message: "Invalid service ID" });
      return;
    }

    const {
      title,
      slug,
      short_description,
      tags,
      hero_image,
      cards,
      hardware_card,
      consultation_card,
      faqs,
      status,
      order_index,
      translations,
    } = req.body;

    const existing = await db.select().from(services).where(eq(services.id, id)).limit(1);
    if (existing.length === 0) {
      res.status(404).json({ status: "error", message: "Service not found." });
      return;
    }

    const targetSlug = slug ? slugify(slug) : (title ? slugify(title) : existing[0].slug);

    await db
      .update(services)
      .set({
        title: title !== undefined ? title : existing[0].title,
        slug: targetSlug,
        shortDescription: short_description !== undefined ? short_description : existing[0].shortDescription,
        tags: tags !== undefined ? tags : existing[0].tags,
        heroImage: hero_image !== undefined ? hero_image : existing[0].heroImage,
        cards: cards !== undefined ? cards : existing[0].cards,
        hardwareCard: hardware_card !== undefined ? hardware_card : existing[0].hardwareCard,
        consultationCard: consultation_card !== undefined ? consultation_card : existing[0].consultationCard,
        faqs: faqs !== undefined ? faqs : existing[0].faqs,
        status: status !== undefined ? status : existing[0].status,
        orderIndex: order_index !== undefined ? Number(order_index) : existing[0].orderIndex,
        translations: translations !== undefined ? translations : existing[0].translations,
      })
      .where(eq(services.id, id));

    try {
      await db.insert(activityLogs).values({
        userId: req.user?.id || 1,
        userName: req.user?.name || "Admin",
        action: `Updated Service: ${title || existing[0].title}`,
        details: `ID: ${id}, Slug: ${targetSlug}`,
        ipAddress: req.ip || "127.0.0.1",
      });
    } catch (_) {}

    res.json({
      status: "success",
      message: "Service updated successfully.",
    });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to update service", error: error.message });
  }
};

// 7. DELETE /api/services/:id (Delete service)
export const deleteService = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await ensureServicesTables();
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ status: "error", message: "Invalid service ID" });
      return;
    }

    const existing = await db.select().from(services).where(eq(services.id, id)).limit(1);
    if (existing.length === 0) {
      res.status(404).json({ status: "error", message: "Service not found." });
      return;
    }

    await db.delete(services).where(eq(services.id, id));

    try {
      await db.insert(activityLogs).values({
        userId: req.user?.id || 1,
        userName: req.user?.name || "Admin",
        action: `Deleted Service: ${existing[0].title}`,
        details: `ID: ${id}`,
        ipAddress: req.ip || "127.0.0.1",
      });
    } catch (_) {}

    res.json({
      status: "success",
      message: "Service deleted successfully.",
    });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to delete service", error: error.message });
  }
};
