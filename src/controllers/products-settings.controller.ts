import { Request, Response } from "express";
import { db, pool } from "../db/index.js";
import {
  sisterConcerns,
  productCategories,
  productSubCategories,
  productTreeCategories,
  productBrands,
  productModels,
} from "../db/schema.js";
import { eq, desc, asc } from "drizzle-orm";

let tablesInitialized = false;

export const ensureProductSettingsTables = async () => {
  if (tablesInitialized) return;

  try {
    // 1. sister_concerns
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sister_concerns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(191) NOT NULL,
        code VARCHAR(50),
        description TEXT,
        logo VARCHAR(500),
        website VARCHAR(255),
        status ENUM('active', 'inactive') DEFAULT 'active' NOT NULL,
        order_index INT DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. product_categories (with sister_concern_id)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sister_concern_id INT NOT NULL,
        name VARCHAR(191) NOT NULL,
        slug VARCHAR(191),
        description TEXT,
        image VARCHAR(500),
        status ENUM('active', 'inactive') DEFAULT 'active' NOT NULL,
        order_index INT DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_sc_id (sister_concern_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. product_sub_categories (with product_category_id)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_sub_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_category_id INT NOT NULL,
        name VARCHAR(191) NOT NULL,
        slug VARCHAR(191),
        description TEXT,
        image VARCHAR(500),
        status ENUM('active', 'inactive') DEFAULT 'active' NOT NULL,
        order_index INT DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_cat_id (product_category_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. product_tree_categories (with product_sub_category_id)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_tree_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_sub_category_id INT NOT NULL,
        name VARCHAR(191) NOT NULL,
        slug VARCHAR(191),
        description TEXT,
        status ENUM('active', 'inactive') DEFAULT 'active' NOT NULL,
        order_index INT DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_subcat_id (product_sub_category_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. product_brands (independent)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_brands (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(191) NOT NULL,
        slug VARCHAR(191),
        logo VARCHAR(500),
        origin_country VARCHAR(100),
        website VARCHAR(255),
        description TEXT,
        status ENUM('active', 'inactive') DEFAULT 'active' NOT NULL,
        order_index INT DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. product_models (linked to brand_id)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_models (
        id INT AUTO_INCREMENT PRIMARY KEY,
        brand_id INT NOT NULL,
        name VARCHAR(191) NOT NULL,
        model_number VARCHAR(191),
        specifications TEXT,
        description TEXT,
        key_features JSON,
        status ENUM('active', 'inactive') DEFAULT 'active' NOT NULL,
        order_index INT DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_brand_id (brand_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Migration: ensure key_features and translations columns exist
    try {
      await pool.query(`ALTER TABLE sister_concerns ADD COLUMN translations JSON NULL`);
    } catch (_) {}
    try {
      await pool.query(`ALTER TABLE product_categories ADD COLUMN translations JSON NULL`);
    } catch (_) {}
    try {
      await pool.query(`ALTER TABLE product_sub_categories ADD COLUMN translations JSON NULL`);
    } catch (_) {}
    try {
      await pool.query(`ALTER TABLE product_tree_categories ADD COLUMN translations JSON NULL`);
    } catch (_) {}
    try {
      await pool.query(`ALTER TABLE product_brands ADD COLUMN translations JSON NULL`);
    } catch (_) {}
    try {
      await pool.query(`ALTER TABLE product_models ADD COLUMN key_features JSON NULL`);
    } catch (_) {}
    try {
      await pool.query(`ALTER TABLE product_models ADD COLUMN translations JSON NULL`);
    } catch (_) {}

    // Check if initial seeding needed
    const [scRows]: any = await pool.query(`SELECT COUNT(*) as count FROM sister_concerns`);
    if (scRows[0].count === 0) {
      console.log("Seeding default Sister Concerns, Categories, Subcategories, Brands & Models...");

      // 1. Seed 2 Sister Concerns
      const [sc1]: any = await pool.query(`
        INSERT INTO sister_concerns (name, code, description, logo, website, status, order_index)
        VALUES ('Solvex Power & Energy Ltd', 'SPEL', 'Specialized in utility-scale solar PV EPC, industrial rooftop solar, and high-voltage BESS energy storage solutions.', 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=200&q=80', 'https://solvexpower.com', 'active', 1)
      `);
      const [sc2]: any = await pool.query(`
        INSERT INTO sister_concerns (name, code, description, logo, website, status, order_index)
        VALUES ('Solvex Industrial CleanTech Ltd', 'SICL', 'Engineered industrial water treatment, ETP, reverse osmosis membrane filtration and green chemical synthesis.', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&q=80', 'https://solvexthech.com', 'active', 2)
      `);

      const sc1Id = sc1.insertId;
      const sc2Id = sc2.insertId;

      // 2. Seed Categories
      const [cat1]: any = await pool.query(`
        INSERT INTO product_categories (sister_concern_id, name, slug, description, image, status, order_index)
        VALUES (?, 'Solar Inverters', 'solar-inverters', 'Commercial and industrial on-grid, off-grid and hybrid energy storage solar inverters.', 'https://images.unsplash.com/photo-1548337138-e87d889cc369?w=500&q=80', 'active', 1)
      `, [sc1Id]);

      const [cat2]: any = await pool.query(`
        INSERT INTO product_categories (sister_concern_id, name, slug, description, image, status, order_index)
        VALUES (?, 'Solar PV Modules', 'solar-pv-modules', 'Ultra-high efficiency N-Type TOPCon and Bifacial Monocrystalline PV panels.', 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=500&q=80', 'active', 2)
      `, [sc1Id]);

      const [cat3]: any = await pool.query(`
        INSERT INTO product_categories (sister_concern_id, name, slug, description, image, status, order_index)
        VALUES (?, 'Energy Storage Systems (BESS)', 'energy-storage-systems', 'Utility containerized and commercial battery energy storage systems.', 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=500&q=80', 'active', 3)
      `, [sc1Id]);

      await pool.query(`
        INSERT INTO product_categories (sister_concern_id, name, slug, description, image, status, order_index)
        VALUES (?, 'Water & Wastewater Treatment', 'water-wastewater-treatment', 'Advanced biological ETP and industrial effluent purification systems.', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&q=80', 'active', 1)
      `, [sc2Id]);

      const cat1Id = cat1.insertId;
      const cat2Id = cat2.insertId;

      // 3. Seed Sub Categories
      const [sub1]: any = await pool.query(`
        INSERT INTO product_sub_categories (product_category_id, name, slug, description, status, order_index)
        VALUES (?, 'On-Grid String Inverters', 'on-grid-string-inverters', 'Grid-tied three-phase and single-phase string inverters.', 'active', 1)
      `, [cat1Id]);

      const [sub2]: any = await pool.query(`
        INSERT INTO product_sub_categories (product_category_id, name, slug, description, status, order_index)
        VALUES (?, 'Hybrid Storage Inverters', 'hybrid-storage-inverters', 'Bidirectional battery storage and grid-tied hybrid inverters.', 'active', 2)
      `, [cat1Id]);

      const [sub3]: any = await pool.query(`
        INSERT INTO product_sub_categories (product_category_id, name, slug, description, status, order_index)
        VALUES (?, 'Bifacial Dual-Glass Panels', 'bifacial-dual-glass-panels', 'High-yield dual glass bifacial monocrystalline solar modules.', 'active', 1)
      `, [cat2Id]);

      const sub1Id = sub1.insertId;
      const sub2Id = sub2.insertId;

      // 4. Seed Tree Categories (Level-3)
      await pool.query(`
        INSERT INTO product_tree_categories (product_sub_category_id, name, slug, description, status, order_index)
        VALUES
        (?, 'Commercial Three-Phase 50kW - 100kW', 'commercial-three-phase-50kw-100kw', 'Ideal for medium-sized industrial rooftops with multi-MPPT tracking.', 'active', 1),
        (?, 'Industrial High-Power 125kW - 330kW', 'industrial-high-power-125kw-330kw', 'Heavy-duty industrial grid-tie string inverters for large factories.', 'active', 2),
        (?, 'Residential Single-Phase 3kW - 6kW', 'residential-single-phase-3kw-6kw', 'Compact rooftop solar inverters with ultra-quiet operation.', 'active', 3)
      `, [sub1Id, sub1Id, sub1Id]);

      await pool.query(`
        INSERT INTO product_tree_categories (product_sub_category_id, name, slug, description, status, order_index)
        VALUES
        (?, 'Low-Voltage Hybrid 5kW - 12kW', 'low-voltage-hybrid-5kw-12kw', 'Compatible with 48V LiFePO4 batteries for commercial backup.', 'active', 1),
        (?, 'High-Voltage Commercial Hybrid 30kW - 50kW', 'high-voltage-commercial-hybrid-30kw-50kw', 'Three-phase emergency power supply and peak shaving.', 'active', 2)
      `, [sub2Id, sub2Id]);

      // 5. Seed Brands
      const [b1]: any = await pool.query(`
        INSERT INTO product_brands (name, slug, logo, origin_country, website, description, status, order_index)
        VALUES ('Growatt', 'growatt', 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Growatt_Logo.png', 'China', 'https://www.ginverter.com', 'Global top tier smart inverter manufacturer with over 150 countries coverage.', 'active', 1)
      `);
      const [b2]: any = await pool.query(`
        INSERT INTO product_brands (name, slug, logo, origin_country, website, description, status, order_index)
        VALUES ('Huawei FusionSolar', 'huawei-fusionsolar', 'https://upload.wikimedia.org/wikipedia/commons/0/00/Huawei_logo.svg', 'China', 'https://solar.huawei.com', 'Pioneering AI and digital power integrated smart string solar inverters.', 'active', 2)
      `);
      const [b3]: any = await pool.query(`
        INSERT INTO product_brands (name, slug, logo, origin_country, website, description, status, order_index)
        VALUES ('Longi Solar', 'longi-solar', 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Longi_logo.svg', 'China', 'https://www.longi.com', 'World leading monocrystalline solar cell and ultra-high efficiency panel manufacturer.', 'active', 3)
      `);
      const [b4]: any = await pool.query(`
        INSERT INTO product_brands (name, slug, logo, origin_country, website, description, status, order_index)
        VALUES ('Trina Solar', 'trina-solar', 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Trina_Solar_logo.svg', 'China', 'https://www.trinasolar.com', 'Pioneering 700W+ Vertex N-type TOPCon dual-glass solar PV technology.', 'active', 4)
      `);
      const [b5]: any = await pool.query(`
        INSERT INTO product_brands (name, slug, logo, origin_country, website, description, status, order_index)
        VALUES ('Sungrow', 'sungrow', 'https://upload.wikimedia.org/wikipedia/commons/8/87/Sungrow_Power_Supply_logo.svg', 'China', 'https://en.sungrowpower.com', 'The worlds most bankable inverter brand with over 405 GW deployed globally.', 'active', 5)
      `);

      const b1Id = b1.insertId;
      const b2Id = b2.insertId;
      const b3Id = b3.insertId;

      // 6. Seed Models
      await pool.query(`
        INSERT INTO product_models (brand_id, name, model_number, specifications, description, status, order_index)
        VALUES
        (?, 'MAX 100-125KTL3-X LV', 'MAX 125KTL3-X', '10 MPPTs, 98.8% Max Efficiency, IP66 protection, Type II SPD on DC & AC', 'Ideal for large C&I rooftop solar installations with high-current PV module support.', 'active', 1),
        (?, 'MID 40KTL3-X', 'MID 40KTL3-X', '4 MPPTs, 98.7% Max Efficiency, OLED display with touch button', 'Lightweight and high-yield commercial string inverter.', 'active', 2),
        (?, 'SPH 10000TL3 BH-UP', 'SPH10000TL3', '10kW Three-Phase Hybrid, UPS-grade 10ms seamless transfer, 100% unbalanced output', 'Top-tier hybrid inverter for critical industrial and healthcare backup loads.', 'active', 3)
      `, [b1Id, b1Id, b1Id]);

      await pool.query(`
        INSERT INTO product_models (brand_id, name, model_number, specifications, description, status, order_index)
        VALUES
        (?, 'SUN2000-100KTL-M2', 'SUN2000-100KTL-M2', '100 kW High-efficiency smart string inverter, 10 MPPTs, AFCI powered by AI', 'Intelligent PV inverter with smart IV curve diagnosis and active arc fault prevention.', 'active', 1),
        (?, 'SUN2000-50KTL-M3', 'SUN2000-50KTL-M3', '50 kW Smart PV controller, 4 MPPTs, IP66 waterproof and dustproof', 'Commercial rooftop inverter optimized for Bangladesh climate conditions.', 'active', 2)
      `, [b2Id, b2Id]);

      await pool.query(`
        INSERT INTO product_models (brand_id, name, model_number, specifications, description, status, order_index)
        VALUES
        (?, 'Hi-MO 6 Explorer', 'LR5-72HTH-585M', '585W Monofacial HPBC Cell Module, 22.6% efficiency, 25-yr product warranty', 'Aesthetic and ultra-high efficiency module for distributed commercial rooftops.', 'active', 1),
        (?, 'Hi-MO 7 Bifacial Dual-Glass', 'LR5-72HGD-610M', '610W Bifacial Dual-Glass Module, HPB 2.0 cell technology, up to 80% bifaciality', 'Ground-mount and open industrial rooftop solar with maximum energy yield.', 'active', 2)
      `, [b3Id, b3Id]);

      console.log("Seeding product settings hierarchy completed successfully.");
    }

    tablesInitialized = true;
  } catch (error) {
    console.error("Failed to initialize product settings tables:", error);
  }
};

// Auto-run ensureProductSettingsTables
ensureProductSettingsTables();

// ==========================================
// 1. SISTER CONCERNS CONTROLLERS
// ==========================================

export const getSisterConcerns = async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureProductSettingsTables();
    const query = `
      SELECT sc.*,
        (SELECT COUNT(*) FROM product_categories pc WHERE pc.sister_concern_id = sc.id) AS categories_count
      FROM sister_concerns sc
      ORDER BY sc.order_index ASC, sc.id ASC
    `;
    const [rows]: any = await pool.query(query);
    const mapped = rows.map((sc: any) => ({
      ...sc,
      translations: sc.translations
        ? (typeof sc.translations === "string" ? JSON.parse(sc.translations) : sc.translations)
        : {},
    }));
    res.json({ status: "success", data: mapped });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to fetch sister concerns", error: error.message });
  }
};

export const getSisterConcernById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows]: any = await pool.query(`SELECT * FROM sister_concerns WHERE id = ?`, [id]);
    if (!rows.length) {
      res.status(404).json({ status: "error", message: "Sister concern not found" });
      return;
    }
    const item = {
      ...rows[0],
      translations: rows[0].translations
        ? (typeof rows[0].translations === "string" ? JSON.parse(rows[0].translations) : rows[0].translations)
        : {},
    };
    res.json({ status: "success", data: item });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to fetch sister concern", error: error.message });
  }
};

export const createSisterConcern = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureProductSettingsTables();
    const { name, code, description, logo, website, status, order_index, translations } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ status: "error", message: "Sister concern name is required" });
      return;
    }

    const [result]: any = await pool.query(`
      INSERT INTO sister_concerns (name, code, description, logo, website, status, order_index, translations)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name.trim(),
      code?.trim() || null,
      description?.trim() || null,
      logo?.trim() || null,
      website?.trim() || null,
      status || "active",
      order_index ? parseInt(order_index, 10) : 0,
      translations ? (typeof translations === "string" ? translations : JSON.stringify(translations)) : null,
    ]);

    const [created]: any = await pool.query(`SELECT * FROM sister_concerns WHERE id = ?`, [result.insertId]);
    const item = {
      ...created[0],
      translations: created[0].translations
        ? (typeof created[0].translations === "string" ? JSON.parse(created[0].translations) : created[0].translations)
        : {},
    };
    res.status(201).json({ status: "success", message: "Sister concern created successfully", data: item });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to create sister concern", error: error.message });
  }
};

export const updateSisterConcern = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, code, description, logo, website, status, order_index, translations } = req.body;

    const [existing]: any = await pool.query(`SELECT id FROM sister_concerns WHERE id = ?`, [id]);
    if (!existing.length) {
      res.status(404).json({ status: "error", message: "Sister concern not found" });
      return;
    }

    await pool.query(`
      UPDATE sister_concerns
      SET name = COALESCE(?, name),
          code = COALESCE(?, code),
          description = COALESCE(?, description),
          logo = COALESCE(?, logo),
          website = COALESCE(?, website),
          status = COALESCE(?, status),
          order_index = COALESCE(?, order_index),
          translations = COALESCE(?, translations)
      WHERE id = ?
    `, [
      name !== undefined ? name.trim() : null,
      code !== undefined ? code?.trim() || null : null,
      description !== undefined ? description?.trim() || null : null,
      logo !== undefined ? logo?.trim() || null : null,
      website !== undefined ? website?.trim() || null : null,
      status !== undefined ? status : null,
      order_index !== undefined ? parseInt(order_index, 10) : null,
      translations !== undefined ? (typeof translations === "string" ? translations : JSON.stringify(translations)) : null,
      id,
    ]);

    const [updated]: any = await pool.query(`SELECT * FROM sister_concerns WHERE id = ?`, [id]);
    const item = {
      ...updated[0],
      translations: updated[0].translations
        ? (typeof updated[0].translations === "string" ? JSON.parse(updated[0].translations) : updated[0].translations)
        : {},
    };
    res.json({ status: "success", message: "Sister concern updated successfully", data: item });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to update sister concern", error: error.message });
  }
};

export const deleteSisterConcern = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    // Delete cascade children
    await pool.query(`DELETE FROM product_categories WHERE sister_concern_id = ?`, [id]);
    await pool.query(`DELETE FROM sister_concerns WHERE id = ?`, [id]);
    res.json({ status: "success", message: "Sister concern and related categories deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to delete sister concern", error: error.message });
  }
};

// ==========================================
// 2. PRODUCT CATEGORIES CONTROLLERS
// ==========================================

export const getProductCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureProductSettingsTables();
    const sisterConcernId = req.query.sister_concern_id ? parseInt(req.query.sister_concern_id as string, 10) : null;

    let query = `
      SELECT pc.*,
        sc.name AS sister_concern_name,
        sc.code AS sister_concern_code,
        (SELECT COUNT(*) FROM product_sub_categories psc WHERE psc.product_category_id = pc.id) AS sub_categories_count
      FROM product_categories pc
      LEFT JOIN sister_concerns sc ON pc.sister_concern_id = sc.id
    `;
    const params: any[] = [];
    if (sisterConcernId) {
      query += ` WHERE pc.sister_concern_id = ? `;
      params.push(sisterConcernId);
    }
    query += ` ORDER BY pc.order_index ASC, pc.id ASC `;

    const [rows]: any = await pool.query(query, params);
    const mapped = rows.map((cat: any) => ({
      ...cat,
      translations: cat.translations
        ? (typeof cat.translations === "string" ? JSON.parse(cat.translations) : cat.translations)
        : {},
    }));
    res.json({ status: "success", data: mapped });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to fetch product categories", error: error.message });
  }
};

export const getProductCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows]: any = await pool.query(`
      SELECT pc.*, sc.name AS sister_concern_name, sc.code AS sister_concern_code
      FROM product_categories pc
      LEFT JOIN sister_concerns sc ON pc.sister_concern_id = sc.id
      WHERE pc.id = ?
    `, [id]);

    if (!rows.length) {
      res.status(404).json({ status: "error", message: "Category not found" });
      return;
    }
    const item = {
      ...rows[0],
      translations: rows[0].translations
        ? (typeof rows[0].translations === "string" ? JSON.parse(rows[0].translations) : rows[0].translations)
        : {},
    };
    res.json({ status: "success", data: item });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to fetch category", error: error.message });
  }
};

export const createProductCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureProductSettingsTables();
    const { sister_concern_id, name, slug, description, image, status, order_index, translations } = req.body;
    if (!sister_concern_id) {
      res.status(400).json({ status: "error", message: "Please select a Sister Concern" });
      return;
    }
    if (!name?.trim()) {
      res.status(400).json({ status: "error", message: "Category name is required" });
      return;
    }

    const finalSlug = slug?.trim() || name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const [result]: any = await pool.query(`
      INSERT INTO product_categories (sister_concern_id, name, slug, description, image, status, order_index, translations)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      parseInt(sister_concern_id, 10),
      name.trim(),
      finalSlug,
      description?.trim() || null,
      image?.trim() || null,
      status || "active",
      order_index ? parseInt(order_index, 10) : 0,
      translations ? (typeof translations === "string" ? translations : JSON.stringify(translations)) : null,
    ]);

    const [created]: any = await pool.query(`SELECT * FROM product_categories WHERE id = ?`, [result.insertId]);
    const item = {
      ...created[0],
      translations: created[0].translations
        ? (typeof created[0].translations === "string" ? JSON.parse(created[0].translations) : created[0].translations)
        : {},
    };
    res.status(201).json({ status: "success", message: "Category created successfully", data: item });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to create category", error: error.message });
  }
};

export const updateProductCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const { sister_concern_id, name, slug, description, image, status, order_index, translations } = req.body;

    const [existing]: any = await pool.query(`SELECT id FROM product_categories WHERE id = ?`, [id]);
    if (!existing.length) {
      res.status(404).json({ status: "error", message: "Category not found" });
      return;
    }

    await pool.query(`
      UPDATE product_categories
      SET sister_concern_id = COALESCE(?, sister_concern_id),
          name = COALESCE(?, name),
          slug = COALESCE(?, slug),
          description = COALESCE(?, description),
          image = COALESCE(?, image),
          status = COALESCE(?, status),
          order_index = COALESCE(?, order_index),
          translations = COALESCE(?, translations)
      WHERE id = ?
    `, [
      sister_concern_id ? parseInt(sister_concern_id, 10) : null,
      name !== undefined ? name.trim() : null,
      slug !== undefined ? slug.trim() : null,
      description !== undefined ? description?.trim() || null : null,
      image !== undefined ? image?.trim() || null : null,
      status !== undefined ? status : null,
      order_index !== undefined ? parseInt(order_index, 10) : null,
      translations !== undefined ? (typeof translations === "string" ? translations : JSON.stringify(translations)) : null,
      id,
    ]);

    const [updated]: any = await pool.query(`SELECT * FROM product_categories WHERE id = ?`, [id]);
    const item = {
      ...updated[0],
      translations: updated[0].translations
        ? (typeof updated[0].translations === "string" ? JSON.parse(updated[0].translations) : updated[0].translations)
        : {},
    };
    res.json({ status: "success", message: "Category updated successfully", data: item });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to update category", error: error.message });
  }
};

export const deleteProductCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.query(`DELETE FROM product_sub_categories WHERE product_category_id = ?`, [id]);
    await pool.query(`DELETE FROM product_categories WHERE id = ?`, [id]);
    res.json({ status: "success", message: "Category and sub-categories deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to delete category", error: error.message });
  }
};

// ==========================================
// 3. PRODUCT SUB-CATEGORIES CONTROLLERS
// ==========================================

export const getProductSubCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureProductSettingsTables();
    const categoryId = req.query.product_category_id ? parseInt(req.query.product_category_id as string, 10) : null;
    const sisterConcernId = req.query.sister_concern_id ? parseInt(req.query.sister_concern_id as string, 10) : null;

    let query = `
      SELECT psc.*,
        pc.name AS category_name,
        pc.sister_concern_id,
        sc.name AS sister_concern_name,
        (SELECT COUNT(*) FROM product_tree_categories ptc WHERE ptc.product_sub_category_id = psc.id) AS tree_categories_count
      FROM product_sub_categories psc
      JOIN product_categories pc ON psc.product_category_id = pc.id
      LEFT JOIN sister_concerns sc ON pc.sister_concern_id = sc.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (categoryId) {
      query += ` AND psc.product_category_id = ? `;
      params.push(categoryId);
    }
    if (sisterConcernId) {
      query += ` AND pc.sister_concern_id = ? `;
      params.push(sisterConcernId);
    }
    query += ` ORDER BY psc.order_index ASC, psc.id ASC `;

    const [rows]: any = await pool.query(query, params);
    const mapped = rows.map((sub: any) => ({
      ...sub,
      translations: sub.translations
        ? (typeof sub.translations === "string" ? JSON.parse(sub.translations) : sub.translations)
        : {},
    }));
    res.json({ status: "success", data: mapped });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to fetch sub-categories", error: error.message });
  }
};

export const createProductSubCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureProductSettingsTables();
    const { product_category_id, name, slug, description, image, status, order_index, translations } = req.body;
    if (!product_category_id) {
      res.status(400).json({ status: "error", message: "Please select a Category" });
      return;
    }
    if (!name?.trim()) {
      res.status(400).json({ status: "error", message: "Sub category name is required" });
      return;
    }

    const finalSlug = slug?.trim() || name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const [result]: any = await pool.query(`
      INSERT INTO product_sub_categories (product_category_id, name, slug, description, image, status, order_index, translations)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      parseInt(product_category_id, 10),
      name.trim(),
      finalSlug,
      description?.trim() || null,
      image?.trim() || null,
      status || "active",
      order_index ? parseInt(order_index, 10) : 0,
      translations ? (typeof translations === "string" ? translations : JSON.stringify(translations)) : null,
    ]);

    const [created]: any = await pool.query(`SELECT * FROM product_sub_categories WHERE id = ?`, [result.insertId]);
    const item = {
      ...created[0],
      translations: created[0].translations
        ? (typeof created[0].translations === "string" ? JSON.parse(created[0].translations) : created[0].translations)
        : {},
    };
    res.status(201).json({ status: "success", message: "Sub category created successfully", data: item });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to create sub category", error: error.message });
  }
};

export const updateProductSubCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const { product_category_id, name, slug, description, image, status, order_index, translations } = req.body;

    const [existing]: any = await pool.query(`SELECT id FROM product_sub_categories WHERE id = ?`, [id]);
    if (!existing.length) {
      res.status(404).json({ status: "error", message: "Sub category not found" });
      return;
    }

    await pool.query(`
      UPDATE product_sub_categories
      SET product_category_id = COALESCE(?, product_category_id),
          name = COALESCE(?, name),
          slug = COALESCE(?, slug),
          description = COALESCE(?, description),
          image = COALESCE(?, image),
          status = COALESCE(?, status),
          order_index = COALESCE(?, order_index),
          translations = COALESCE(?, translations)
      WHERE id = ?
    `, [
      product_category_id ? parseInt(product_category_id, 10) : null,
      name !== undefined ? name.trim() : null,
      slug !== undefined ? slug.trim() : null,
      description !== undefined ? description?.trim() || null : null,
      image !== undefined ? image?.trim() || null : null,
      status !== undefined ? status : null,
      order_index !== undefined ? parseInt(order_index, 10) : null,
      translations !== undefined ? (typeof translations === "string" ? translations : JSON.stringify(translations)) : null,
      id,
    ]);

    const [updated]: any = await pool.query(`SELECT * FROM product_sub_categories WHERE id = ?`, [id]);
    const item = {
      ...updated[0],
      translations: updated[0].translations
        ? (typeof updated[0].translations === "string" ? JSON.parse(updated[0].translations) : updated[0].translations)
        : {},
    };
    res.json({ status: "success", message: "Sub category updated successfully", data: item });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to update sub category", error: error.message });
  }
};

export const deleteProductSubCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.query(`DELETE FROM product_tree_categories WHERE product_sub_category_id = ?`, [id]);
    await pool.query(`DELETE FROM product_sub_categories WHERE id = ?`, [id]);
    res.json({ status: "success", message: "Sub category and leaf tree categories deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to delete sub category", error: error.message });
  }
};

// ==========================================
// 4. PRODUCT TREE CATEGORIES CONTROLLERS
// ==========================================

export const getProductTreeCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureProductSettingsTables();
    const subCategoryId = req.query.product_sub_category_id ? parseInt(req.query.product_sub_category_id as string, 10) : null;

    let query = `
      SELECT ptc.*,
        psc.name AS sub_category_name,
        pc.id AS category_id,
        pc.name AS category_name,
        sc.id AS sister_concern_id,
        sc.name AS sister_concern_name
      FROM product_tree_categories ptc
      JOIN product_sub_categories psc ON ptc.product_sub_category_id = psc.id
      JOIN product_categories pc ON psc.product_category_id = pc.id
      LEFT JOIN sister_concerns sc ON pc.sister_concern_id = sc.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (subCategoryId) {
      query += ` AND ptc.product_sub_category_id = ? `;
      params.push(subCategoryId);
    }
    query += ` ORDER BY ptc.order_index ASC, ptc.id ASC `;

    const [rows]: any = await pool.query(query, params);
    const mapped = rows.map((tree: any) => ({
      ...tree,
      translations: tree.translations
        ? (typeof tree.translations === "string" ? JSON.parse(tree.translations) : tree.translations)
        : {},
    }));
    res.json({ status: "success", data: mapped });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to fetch tree categories", error: error.message });
  }
};

export const createProductTreeCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureProductSettingsTables();
    const { product_sub_category_id, name, slug, description, status, order_index, translations } = req.body;
    if (!product_sub_category_id) {
      res.status(400).json({ status: "error", message: "Please select a Sub Category" });
      return;
    }
    if (!name?.trim()) {
      res.status(400).json({ status: "error", message: "Tree category name is required" });
      return;
    }

    const finalSlug = slug?.trim() || name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const [result]: any = await pool.query(`
      INSERT INTO product_tree_categories (product_sub_category_id, name, slug, description, status, order_index, translations)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      parseInt(product_sub_category_id, 10),
      name.trim(),
      finalSlug,
      description?.trim() || null,
      status || "active",
      order_index ? parseInt(order_index, 10) : 0,
      translations ? (typeof translations === "string" ? translations : JSON.stringify(translations)) : null,
    ]);

    const [created]: any = await pool.query(`SELECT * FROM product_tree_categories WHERE id = ?`, [result.insertId]);
    const item = {
      ...created[0],
      translations: created[0].translations
        ? (typeof created[0].translations === "string" ? JSON.parse(created[0].translations) : created[0].translations)
        : {},
    };
    res.status(201).json({ status: "success", message: "Tree category created successfully", data: item });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to create tree category", error: error.message });
  }
};

export const updateProductTreeCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const { product_sub_category_id, name, slug, description, status, order_index, translations } = req.body;

    const [existing]: any = await pool.query(`SELECT id FROM product_tree_categories WHERE id = ?`, [id]);
    if (!existing.length) {
      res.status(404).json({ status: "error", message: "Tree category not found" });
      return;
    }

    await pool.query(`
      UPDATE product_tree_categories
      SET product_sub_category_id = COALESCE(?, product_sub_category_id),
          name = COALESCE(?, name),
          slug = COALESCE(?, slug),
          description = COALESCE(?, description),
          status = COALESCE(?, status),
          order_index = COALESCE(?, order_index),
          translations = COALESCE(?, translations)
      WHERE id = ?
    `, [
      product_sub_category_id ? parseInt(product_sub_category_id, 10) : null,
      name !== undefined ? name.trim() : null,
      slug !== undefined ? slug.trim() : null,
      description !== undefined ? description?.trim() || null : null,
      status !== undefined ? status : null,
      order_index !== undefined ? parseInt(order_index, 10) : null,
      translations !== undefined ? (typeof translations === "string" ? translations : JSON.stringify(translations)) : null,
      id,
    ]);

    const [updated]: any = await pool.query(`SELECT * FROM product_tree_categories WHERE id = ?`, [id]);
    const item = {
      ...updated[0],
      translations: updated[0].translations
        ? (typeof updated[0].translations === "string" ? JSON.parse(updated[0].translations) : updated[0].translations)
        : {},
    };
    res.json({ status: "success", message: "Tree category updated successfully", data: item });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to update tree category", error: error.message });
  }
};

export const deleteProductTreeCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.query(`DELETE FROM product_tree_categories WHERE id = ?`, [id]);
    res.json({ status: "success", message: "Tree category deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to delete tree category", error: error.message });
  }
};

// ==========================================
// 5. PRODUCT BRANDS CONTROLLERS (Individual)
// ==========================================

export const getProductBrands = async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureProductSettingsTables();
    const query = `
      SELECT pb.*,
        (SELECT COUNT(*) FROM product_models pm WHERE pm.brand_id = pb.id) AS models_count
      FROM product_brands pb
      ORDER BY pb.order_index ASC, pb.name ASC
    `;
    const [rows]: any = await pool.query(query);
    const mapped = rows.map((b: any) => ({
      ...b,
      translations: b.translations
        ? (typeof b.translations === "string" ? JSON.parse(b.translations) : b.translations)
        : {},
    }));
    res.json({ status: "success", data: mapped });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to fetch brands", error: error.message });
  }
};

export const getProductBrandById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows]: any = await pool.query(`SELECT * FROM product_brands WHERE id = ?`, [id]);
    if (!rows.length) {
      res.status(404).json({ status: "error", message: "Brand not found" });
      return;
    }
    const item = {
      ...rows[0],
      translations: rows[0].translations
        ? (typeof rows[0].translations === "string" ? JSON.parse(rows[0].translations) : rows[0].translations)
        : {},
    };
    res.json({ status: "success", data: item });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to fetch brand", error: error.message });
  }
};

export const createProductBrand = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureProductSettingsTables();
    const { name, slug, logo, origin_country, website, description, status, order_index, translations } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ status: "error", message: "Brand name is required" });
      return;
    }

    const finalSlug = slug?.trim() || name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const [result]: any = await pool.query(`
      INSERT INTO product_brands (name, slug, logo, origin_country, website, description, status, order_index, translations)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name.trim(),
      finalSlug,
      logo?.trim() || null,
      origin_country?.trim() || null,
      website?.trim() || null,
      description?.trim() || null,
      status || "active",
      order_index ? parseInt(order_index, 10) : 0,
      translations ? (typeof translations === "string" ? translations : JSON.stringify(translations)) : null,
    ]);

    const [created]: any = await pool.query(`SELECT * FROM product_brands WHERE id = ?`, [result.insertId]);
    const item = {
      ...created[0],
      translations: created[0].translations
        ? (typeof created[0].translations === "string" ? JSON.parse(created[0].translations) : created[0].translations)
        : {},
    };
    res.status(201).json({ status: "success", message: "Brand created successfully", data: item });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to create brand", error: error.message });
  }
};

export const updateProductBrand = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, slug, logo, origin_country, website, description, status, order_index, translations } = req.body;

    const [existing]: any = await pool.query(`SELECT id FROM product_brands WHERE id = ?`, [id]);
    if (!existing.length) {
      res.status(404).json({ status: "error", message: "Brand not found" });
      return;
    }

    await pool.query(`
      UPDATE product_brands
      SET name = COALESCE(?, name),
          slug = COALESCE(?, slug),
          logo = COALESCE(?, logo),
          origin_country = COALESCE(?, origin_country),
          website = COALESCE(?, website),
          description = COALESCE(?, description),
          status = COALESCE(?, status),
          order_index = COALESCE(?, order_index),
          translations = COALESCE(?, translations)
      WHERE id = ?
    `, [
      name !== undefined ? name.trim() : null,
      slug !== undefined ? slug.trim() : null,
      logo !== undefined ? logo?.trim() || null : null,
      origin_country !== undefined ? origin_country?.trim() || null : null,
      website !== undefined ? website?.trim() || null : null,
      description !== undefined ? description?.trim() || null : null,
      status !== undefined ? status : null,
      order_index !== undefined ? parseInt(order_index, 10) : null,
      translations !== undefined ? (typeof translations === "string" ? translations : JSON.stringify(translations)) : null,
      id,
    ]);

    const [updated]: any = await pool.query(`SELECT * FROM product_brands WHERE id = ?`, [id]);
    const item = {
      ...updated[0],
      translations: updated[0].translations
        ? (typeof updated[0].translations === "string" ? JSON.parse(updated[0].translations) : updated[0].translations)
        : {},
    };
    res.json({ status: "success", message: "Brand updated successfully", data: item });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to update brand", error: error.message });
  }
};

export const deleteProductBrand = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.query(`DELETE FROM product_models WHERE brand_id = ?`, [id]);
    await pool.query(`DELETE FROM product_brands WHERE id = ?`, [id]);
    res.json({ status: "success", message: "Brand and its models deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to delete brand", error: error.message });
  }
};

// ==========================================
// 6. PRODUCT MODELS CONTROLLERS (Linked to Brand)
// ==========================================

export const getProductModels = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureProductSettingsTables();
    const brandId = req.query.brand_id ? parseInt(req.query.brand_id as string, 10) : null;

    let query = `
      SELECT pm.*,
        pb.name AS brand_name,
        pb.logo AS brand_logo,
        pb.origin_country AS brand_origin_country
      FROM product_models pm
      JOIN product_brands pb ON pm.brand_id = pb.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (brandId) {
      query += ` AND pm.brand_id = ? `;
      params.push(brandId);
    }
    query += ` ORDER BY pm.order_index ASC, pm.id ASC `;

    const [rows]: any = await pool.query(query, params);
    const mapped = rows.map((pm: any) => ({
      ...pm,
      key_features: pm.key_features
        ? (typeof pm.key_features === "string" ? JSON.parse(pm.key_features) : pm.key_features)
        : [],
      translations: pm.translations
        ? (typeof pm.translations === "string" ? JSON.parse(pm.translations) : pm.translations)
        : {},
    }));
    res.json({ status: "success", data: mapped });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to fetch models", error: error.message });
  }
};

export const getProductModelById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows]: any = await pool.query(`
      SELECT pm.*, pb.name AS brand_name, pb.logo AS brand_logo
      FROM product_models pm
      JOIN product_brands pb ON pm.brand_id = pb.id
      WHERE pm.id = ?
    `, [id]);

    if (!rows.length) {
      res.status(404).json({ status: "error", message: "Model not found" });
      return;
    }
    const item = {
      ...rows[0],
      key_features: rows[0].key_features
        ? (typeof rows[0].key_features === "string" ? JSON.parse(rows[0].key_features) : rows[0].key_features)
        : [],
      translations: rows[0].translations
        ? (typeof rows[0].translations === "string" ? JSON.parse(rows[0].translations) : rows[0].translations)
        : {},
    };
    res.json({ status: "success", data: item });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to fetch model", error: error.message });
  }
};

export const createProductModel = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureProductSettingsTables();
    const { brand_id, name, model_number, specifications, description, key_features, translations, status, order_index } = req.body;
    if (!brand_id) {
      res.status(400).json({ status: "error", message: "Please select a Brand" });
      return;
    }
    if (!name?.trim()) {
      res.status(400).json({ status: "error", message: "Model name is required" });
      return;
    }

    const [result]: any = await pool.query(`
      INSERT INTO product_models (brand_id, name, model_number, specifications, description, key_features, translations, status, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      parseInt(brand_id, 10),
      name.trim(),
      model_number?.trim() || null,
      specifications?.trim() || null,
      description?.trim() || null,
      key_features ? JSON.stringify(Array.isArray(key_features) ? key_features : [key_features]) : JSON.stringify([]),
      translations ? JSON.stringify(translations) : JSON.stringify({}),
      status || "active",
      order_index ? parseInt(order_index, 10) : 0,
    ]);

    const [created]: any = await pool.query(`SELECT * FROM product_models WHERE id = ?`, [result.insertId]);
    const item = {
      ...created[0],
      key_features: created[0].key_features
        ? (typeof created[0].key_features === "string" ? JSON.parse(created[0].key_features) : created[0].key_features)
        : [],
      translations: created[0].translations
        ? (typeof created[0].translations === "string" ? JSON.parse(created[0].translations) : created[0].translations)
        : {},
    };
    res.status(201).json({ status: "success", message: "Model created successfully", data: item });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to create model", error: error.message });
  }
};

export const updateProductModel = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureProductSettingsTables();
    const id = parseInt(req.params.id, 10);
    const { brand_id, name, model_number, specifications, description, key_features, translations, status, order_index } = req.body;

    const [existing]: any = await pool.query(`SELECT id FROM product_models WHERE id = ?`, [id]);
    if (!existing.length) {
      res.status(404).json({ status: "error", message: "Model not found" });
      return;
    }

    await pool.query(`
      UPDATE product_models
      SET brand_id = COALESCE(?, brand_id),
          name = COALESCE(?, name),
          model_number = COALESCE(?, model_number),
          specifications = COALESCE(?, specifications),
          description = COALESCE(?, description),
          key_features = COALESCE(?, key_features),
          translations = COALESCE(?, translations),
          status = COALESCE(?, status),
          order_index = COALESCE(?, order_index)
      WHERE id = ?
    `, [
      brand_id ? parseInt(brand_id, 10) : null,
      name !== undefined ? name.trim() : null,
      model_number !== undefined ? model_number?.trim() || null : null,
      specifications !== undefined ? specifications?.trim() || null : null,
      description !== undefined ? description?.trim() || null : null,
      key_features !== undefined ? JSON.stringify(Array.isArray(key_features) ? key_features : []) : null,
      translations !== undefined ? JSON.stringify(translations) : null,
      status !== undefined ? status : null,
      order_index !== undefined ? parseInt(order_index, 10) : null,
      id,
    ]);

    const [updated]: any = await pool.query(`SELECT * FROM product_models WHERE id = ?`, [id]);
    const item = {
      ...updated[0],
      key_features: updated[0].key_features
        ? (typeof updated[0].key_features === "string" ? JSON.parse(updated[0].key_features) : updated[0].key_features)
        : [],
      translations: updated[0].translations
        ? (typeof updated[0].translations === "string" ? JSON.parse(updated[0].translations) : updated[0].translations)
        : {},
    };
    res.json({ status: "success", message: "Model updated successfully", data: item });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to update model", error: error.message });
  }
};

export const deleteProductModel = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.query(`DELETE FROM product_models WHERE id = ?`, [id]);
    res.json({ status: "success", message: "Model deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to delete model", error: error.message });
  }
};
