import { Request, Response } from "express";
import { db, pool } from "../db/index.js";
import {
  projects,
  projectCategories,
  projectsPageSettings,
  Project,
  NewProject,
} from "../db/schema.js";
import { eq, desc, asc, or } from "drizzle-orm";

let tablesInitialized = false;

export const ensureProjectsTables = async () => {
  if (tablesInitialized) return;

  try {
    // 1. Create project_categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(191) NOT NULL,
        status BOOLEAN DEFAULT TRUE NOT NULL,
        show_in_website BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Create projects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(191) UNIQUE,
        project_category_id INT,
        label VARCHAR(191),
        big_title VARCHAR(255) NOT NULL,
        description_cards JSON,
        details_card JSON,
        faq_icon VARCHAR(100),
        faq_title VARCHAR(191),
        faq_description TEXT,
        faq_questions JSON,
        status ENUM('published', 'draft') DEFAULT 'published' NOT NULL,
        order_index INT DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await pool.query(`ALTER TABLE projects ADD COLUMN translations JSON NULL`);
    } catch (_) {}

    // 3. Create projects_page_settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects_page_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        badge VARCHAR(191),
        title VARCHAR(191),
        title_highlight VARCHAR(191),
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed default categories if empty
    const [catRows]: any = await pool.query(`SELECT COUNT(*) as count FROM project_categories`);
    if (catRows[0].count === 0) {
      await pool.query(`
        INSERT INTO project_categories (name, status, show_in_website) VALUES
        ('Industrial Rooftop Solar', 1, 1),
        ('Commercial BESS Solutions', 1, 1),
        ('Textile & Apparel Solar', 1, 1),
        ('Utility-Scale Solar', 1, 1);
      `);
    }

    // Seed default page settings if empty
    const [settingRows]: any = await pool.query(`SELECT COUNT(*) as count FROM projects_page_settings`);
    if (settingRows[0].count === 0) {
      await pool.query(`
        INSERT INTO projects_page_settings (badge, title, title_highlight, description) VALUES (
          'Portfolio Archive',
          'Case Studies & Global Deployments',
          'Global Deployments',
          'Explore the structural engineering, battery storage synchronicity, and grid synchronization audits behind our active zero-emission projects.'
        );
      `);
    }

    // Seed default project if empty
    const [projectRows]: any = await pool.query(`SELECT COUNT(*) as count FROM projects`);
    if (projectRows[0].count === 0) {
      const defaultDescCards = JSON.stringify([
        { title: "5.2 MWp", subtitle: "System Capacity" },
        { title: "6.8 GWh", subtitle: "Annual Yield" },
        { title: "4,200 Tons", subtitle: "CO2 Offset" },
        { title: "3.8 Years", subtitle: "Capital Payback" },
      ]);

      const defaultDetailsCard = JSON.stringify([
        {
          label: "Milestone 01",
          label_color: "#10B981",
          title: "Structural Aerodynamic Modeling & Ballast Integration",
          description_1: "Engineered specifically for heavy industrial corrugated tin and standing seam roofs, featuring non-penetrating clamps tested to 180 km/h wind speeds.",
          description_2: "Full 3D LiDAR point-cloud scans and shadow analysis ensured maximum annual kilowatt-hour density across the 280,000 sq ft factory footprint.",
          bullet_points: [
            { icon_color: "#10B981", text: "Zero roof penetration with marine-grade AL6005-T5 anodized aluminum clamping." },
            { icon_color: "#10B981", text: "Certified wind-tunnel resilience up to 180 km/h wind shear ratings." },
          ],
          image: "https://images.unsplash.com/photo-1508873696983-2df5293cb395?w=800&auto=format&fit=crop&q=80",
          image_left: false,
        },
        {
          label: "Milestone 02",
          label_color: "#06B6D4",
          title: "Tier-1 TOPCon Bifacial Modules & String Inverter Architecture",
          description_1: "Deployment of high-yield N-Type TOPCon bifacial modules coupled with multi-MPPT smart string inverters for real-time string-level yield optimization.",
          description_2: "Euro efficiency rating of 99.0% with automated AI-assisted arc fault circuit interruption (AFCI) protecting facility assets 24/7.",
          bullet_points: [
            { icon_color: "#06B6D4", text: "N-Type TOPCon bifacial modules achieving up to 22.8% conversion efficiency." },
            { icon_color: "#06B6D4", text: "Multi-MPPT string architecture with rapid shutdown and SCADA telemetry." },
          ],
          image: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80",
          image_left: true,
        },
      ]);

      const defaultFaqs = JSON.stringify([
        {
          question: "How does the non-penetrating clamping protect the factory roof?",
          answer: "We deploy precision-engineered aluminum standing-seam clamps with EPDM rubber dampening that grip the seams without puncturing the roof sheet, preserving 100% of factory waterproofing warranties.",
        },
        {
          question: "What SCADA monitoring capabilities are provided?",
          answer: "The plant features cloud-connected IoT SCADA monitoring with string-level irradiance tracking, automated fault alerts, and real-time net-metering accounting.",
        },
      ]);

      await pool.query(
        `INSERT INTO projects (
          slug, project_category_id, label, big_title, description_cards, details_card,
          faq_title, faq_description, faq_questions, status, order_index
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          "5-2-mwp-commercial-rooftop-solar-epc",
          1,
          "Turnkey Industrial EPC",
          "5.2 MWp Commercial Rooftop Solar EPC Deployment",
          defaultDescCards,
          defaultDetailsCard,
          "Project FAQs",
          "Frequently asked technical and operational questions regarding this industrial solar deployment.",
          defaultFaqs,
          "published",
          1,
        ]
      );
    }

    tablesInitialized = true;
  } catch (error) {
    console.error("Error ensuring projects tables:", error);
  }
};

// Helper: map project entity to frontend response
const formatProjectResponse = (p: any, catMap?: Map<number, any>) => {
  const cat = p.projectCategoryId && catMap ? catMap.get(p.projectCategoryId) : null;
  return {
    id: p.id,
    slug: p.slug,
    project_category_id: p.projectCategoryId,
    project_category: cat
      ? {
          id: cat.id,
          name: cat.name,
          status: Boolean(cat.status),
          show_in_website: Boolean(cat.showInWebsite),
        }
      : undefined,
    label: p.label,
    big_title: p.bigTitle,
    description_cards: p.descriptionCards || [],
    details_card: p.detailsCard || [],
    faq_icon: p.faqIcon,
    faq_title: p.faqTitle,
    faq_description: p.faqDescription,
    faq_questions: p.faqQuestions || [],
    status: p.status,
    order_index: p.orderIndex,
    translations: p.translations || {},
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
};

// 1. GET /api/projects
export const getProjects = async (req: Request, res: Response): Promise<void> => {
  await ensureProjectsTables();
  try {
    const list = await db
      .select()
      .from(projects)
      .orderBy(asc(projects.orderIndex), desc(projects.id));

    const cats = await db.select().from(projectCategories);
    const catMap = new Map<number, any>(cats.map((c) => [c.id, c]));

    const mapped = list.map((p) => formatProjectResponse(p, catMap));
    res.json(mapped);
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to fetch projects", error: error.message });
  }
};

// 2. GET /api/projects/:id (Single project by id or slug)
export const getProjectById = async (req: Request, res: Response): Promise<void> => {
  await ensureProjectsTables();
  try {
    const param = req.params.id;
    const isNum = !isNaN(Number(param));

    let condition = eq(projects.slug, param);
    if (isNum) {
      condition = or(eq(projects.slug, param), eq(projects.id, Number(param))) as any;
    }

    const found = await db.select().from(projects).where(condition).limit(1);

    if (found.length > 0) {
      const p = found[0];
      const cats = await db.select().from(projectCategories);
      const catMap = new Map<number, any>(cats.map((c) => [c.id, c]));

      res.json(formatProjectResponse(p, catMap));
      return;
    }

    res.status(404).json({ status: "error", message: "Project not found." });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to fetch project", error: error.message });
  }
};

// 3. POST /api/projects
export const createProject = async (req: Request, res: Response): Promise<void> => {
  await ensureProjectsTables();
  try {
    const {
      slug,
      project_category_id,
      label,
      big_title,
      description_cards,
      details_card,
      faq_icon,
      faq_title,
      faq_description,
      faq_questions,
      status,
      order_index,
      translations,
    } = req.body;

    if (!big_title) {
      res.status(400).json({ status: "error", message: "Project title is required." });
      return;
    }

    const cleanSlug = slug
      ? slug.trim().toLowerCase().replace(/\s+/g, "-")
      : big_title.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w\-]+/g, "");

    const insertResult = await db.insert(projects).values({
      slug: cleanSlug,
      projectCategoryId: project_category_id ? Number(project_category_id) : null,
      label: label || null,
      bigTitle: big_title,
      descriptionCards: description_cards || [],
      detailsCard: details_card || [],
      faqIcon: faq_icon || null,
      faqTitle: faq_title || "Project FAQs",
      faqDescription: faq_description || null,
      faqQuestions: faq_questions || [],
      status: status || "published",
      orderIndex: typeof order_index === "number" ? order_index : 0,
      translations: translations || null,
    });

    res.status(201).json({
      status: "success",
      message: "Project created successfully.",
      data: { id: insertResult[0].insertId },
    });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to create project", error: error.message });
  }
};

// 4. PUT /api/projects/:id
export const updateProject = async (req: Request, res: Response): Promise<void> => {
  await ensureProjectsTables();
  try {
    const id = Number(req.params.id);
    const existing = await db.select().from(projects).where(eq(projects.id, id)).limit(1);

    if (existing.length === 0) {
      res.status(404).json({ status: "error", message: "Project not found." });
      return;
    }

    const {
      slug,
      project_category_id,
      label,
      big_title,
      description_cards,
      details_card,
      faq_icon,
      faq_title,
      faq_description,
      faq_questions,
      status,
      order_index,
      translations,
    } = req.body;

    await db
      .update(projects)
      .set({
        slug: slug !== undefined ? slug : existing[0].slug,
        projectCategoryId: project_category_id !== undefined ? (project_category_id ? Number(project_category_id) : null) : existing[0].projectCategoryId,
        label: label !== undefined ? label : existing[0].label,
        bigTitle: big_title !== undefined ? big_title : existing[0].bigTitle,
        descriptionCards: description_cards !== undefined ? description_cards : existing[0].descriptionCards,
        detailsCard: details_card !== undefined ? details_card : existing[0].detailsCard,
        faqIcon: faq_icon !== undefined ? faq_icon : existing[0].faqIcon,
        faqTitle: faq_title !== undefined ? faq_title : existing[0].faqTitle,
        faqDescription: faq_description !== undefined ? faq_description : existing[0].faqDescription,
        faqQuestions: faq_questions !== undefined ? faq_questions : existing[0].faqQuestions,
        status: status !== undefined ? status : existing[0].status,
        orderIndex: order_index !== undefined ? Number(order_index) : existing[0].orderIndex,
        translations: translations !== undefined ? translations : existing[0].translations,
      })
      .where(eq(projects.id, id));

    res.json({
      status: "success",
      message: "Project updated successfully.",
    });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to update project", error: error.message });
  }
};

// 5. DELETE /api/projects/:id
export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  await ensureProjectsTables();
  try {
    const id = Number(req.params.id);
    await db.delete(projects).where(eq(projects.id, id));
    res.json({ status: "success", message: "Project deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to delete project", error: error.message });
  }
};

// 6. GET /api/project-categories
export const getProjectCategories = async (_req: Request, res: Response): Promise<void> => {
  await ensureProjectsTables();
  try {
    const list = await db.select().from(projectCategories).orderBy(asc(projectCategories.name));
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to fetch categories", error: error.message });
  }
};

// 7. POST /api/project-categories
export const createProjectCategory = async (req: Request, res: Response): Promise<void> => {
  await ensureProjectsTables();
  try {
    const { name, status, show_in_website } = req.body;
    if (!name) {
      res.status(400).json({ status: "error", message: "Category name is required." });
      return;
    }

    const insertResult = await db.insert(projectCategories).values({
      name,
      status: status !== undefined ? Boolean(status) : true,
      showInWebsite: show_in_website !== undefined ? Boolean(show_in_website) : true,
    });

    res.status(201).json({
      status: "success",
      message: "Category created successfully.",
      data: { id: insertResult[0].insertId, name },
    });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to create category", error: error.message });
  }
};

// 8. PUT /api/project-categories/:id
export const updateProjectCategory = async (req: Request, res: Response): Promise<void> => {
  await ensureProjectsTables();
  try {
    const id = Number(req.params.id);
    const { name, status, show_in_website } = req.body;

    await db
      .update(projectCategories)
      .set({
        ...(name !== undefined && { name }),
        ...(status !== undefined && { status: Boolean(status) }),
        ...(show_in_website !== undefined && { showInWebsite: Boolean(show_in_website) }),
      })
      .where(eq(projectCategories.id, id));

    res.json({ status: "success", message: "Category updated successfully." });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to update category", error: error.message });
  }
};

// 9. DELETE /api/project-categories/:id
export const deleteProjectCategory = async (req: Request, res: Response): Promise<void> => {
  await ensureProjectsTables();
  try {
    const id = Number(req.params.id);
    await db.delete(projectCategories).where(eq(projectCategories.id, id));
    res.json({ status: "success", message: "Category deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to delete category", error: error.message });
  }
};

// 10. GET /api/projects-page (Archive Page CMS)
export const getProjectsPageSettings = async (_req: Request, res: Response): Promise<void> => {
  await ensureProjectsTables();
  try {
    const list = await db.select().from(projectsPageSettings).limit(1);
    if (list.length > 0) {
      const s = list[0];
      res.json({
        id: s.id,
        badge: s.badge,
        title: s.title,
        title_highlight: s.titleHighlight,
        description: s.description,
        updated_at: s.updatedAt,
      });
      return;
    }
    res.status(404).json({ status: "error", message: "Settings not found." });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to fetch settings", error: error.message });
  }
};

// 11. PUT /api/projects-page (Archive Page CMS)
export const updateProjectsPageSettings = async (req: Request, res: Response): Promise<void> => {
  await ensureProjectsTables();
  try {
    const { badge, title, title_highlight, description } = req.body;
    const existing = await db.select().from(projectsPageSettings).limit(1);

    if (existing.length > 0) {
      await db
        .update(projectsPageSettings)
        .set({
          badge: badge !== undefined ? badge : existing[0].badge,
          title: title !== undefined ? title : existing[0].title,
          titleHighlight: title_highlight !== undefined ? title_highlight : existing[0].titleHighlight,
          description: description !== undefined ? description : existing[0].description,
        })
        .where(eq(projectsPageSettings.id, existing[0].id));
    } else {
      await db.insert(projectsPageSettings).values({
        badge,
        title,
        titleHighlight: title_highlight,
        description,
      });
    }

    res.json({ status: "success", message: "Projects page settings updated successfully." });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to update settings", error: error.message });
  }
};
