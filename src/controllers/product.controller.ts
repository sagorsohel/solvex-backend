import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { db, pool } from "../db/index.js";
import { products, inquiries, activityLogs } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";

let columnsEnsured = false;

export const ensureProductsColumns = async () => {
  if (columnsEnsured) return;
  try {
    const dbName = process.env.DB_NAME || "solvex_db";
    const [existingCols]: any = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products'`,
      [dbName]
    );
    const existingColNames = new Set((existingCols || []).map((c: any) => c.COLUMN_NAME.toLowerCase()));

    const columnsToAdd: { name: string; definition: string }[] = [
      { name: "slug", definition: "VARCHAR(191) NULL" },
      { name: "sister_concern_id", definition: "INT NULL" },
      { name: "product_category_id", definition: "INT NULL" },
      { name: "product_sub_category_id", definition: "INT NULL" },
      { name: "product_tree_category_id", definition: "INT NULL" },
      { name: "product_brand_id", definition: "INT NULL" },
      { name: "product_model_id", definition: "INT NULL" },
      { name: "sku", definition: "VARCHAR(100) NULL" },
      { name: "features", definition: "JSON NULL" },
      { name: "is_featured", definition: "TINYINT(1) DEFAULT 0 NOT NULL" },
      { name: "is_upcoming", definition: "TINYINT(1) DEFAULT 0 NOT NULL" },
      { name: "gallery_images", definition: "JSON NULL" },
      { name: "datasheet_pdf", definition: "VARCHAR(500) NULL" },
      { name: "datasheet_specs", definition: "JSON NULL" },
      { name: "brochures", definition: "JSON NULL" },
      { name: "translations", definition: "JSON NULL" },
    ];

    for (const col of columnsToAdd) {
      if (!existingColNames.has(col.name.toLowerCase())) {
        try {
          await pool.query(`ALTER TABLE products ADD COLUMN \`${col.name}\` ${col.definition}`);
          console.log(`[DB Migration] Added column products.${col.name}`);
        } catch (colErr: any) {
          console.error(`Failed to add column ${col.name}:`, colErr.message);
        }
      }
    }

    try {
      await pool.query(`ALTER TABLE products MODIFY COLUMN description LONGTEXT NULL`);
    } catch (_) {}

    columnsEnsured = true;
  } catch (err) {
    console.error("Failed to ensure products table columns:", err);
  }
};

const safeJsonParse = (val: any, defaultVal: any = []) => {
  if (!val) return defaultVal;
  if (typeof val !== "string") return val;
  try {
    return JSON.parse(val);
  } catch (_) {
    return defaultVal;
  }
};

export const getProducts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureProductsColumns();

    const includeDesc = req.query.include_description === "true";

    const [rows]: any = await pool.query(`
      SELECT 
        p.id,
        p.title,
        p.category,
        p.price,
        p.stock,
        p.status,
        p.image,
        p.created_at,
        p.updated_at,
        p.slug,
        p.sister_concern_id,
        p.product_category_id,
        p.product_sub_category_id,
        p.product_tree_category_id,
        p.product_brand_id,
        p.product_model_id,
        p.sku,
        p.features,
        p.is_featured,
        p.is_upcoming,
        p.gallery_images,
        p.datasheet_pdf,
        p.datasheet_specs,
        p.brochures,
        p.translations,
        ${includeDesc ? "p.description," : "SUBSTRING(p.description, 1, 300) AS short_description,"}
        sc.name AS sister_concern_name,
        sc.code AS sister_concern_code,
        pc.name AS category_name,
        psc.name AS sub_category_name,
        ptc.name AS tree_category_name,
        pb.name AS brand_name,
        pb.logo AS brand_logo,
        pm.name AS model_name,
        pm.model_number AS model_number
      FROM products p
      LEFT JOIN sister_concerns sc ON p.sister_concern_id = sc.id
      LEFT JOIN product_categories pc ON p.product_category_id = pc.id
      LEFT JOIN product_sub_categories psc ON p.product_sub_category_id = psc.id
      LEFT JOIN product_tree_categories ptc ON p.product_tree_category_id = ptc.id
      LEFT JOIN product_brands pb ON p.product_brand_id = pb.id
      LEFT JOIN product_models pm ON p.product_model_id = pm.id
      ORDER BY p.id DESC
    `);

    const formatted = (rows || []).map((row: any) => ({
      ...row,
      features: safeJsonParse(row.features, []),
      gallery_images: safeJsonParse(row.gallery_images, []),
      datasheet_specs: safeJsonParse(row.datasheet_specs, []),
      brochures: safeJsonParse(row.brochures, []),
      translations: safeJsonParse(row.translations, {}),
      is_featured: Boolean(row.is_featured),
      is_upcoming: Boolean(row.is_upcoming),
    }));

    res.json({ success: true, data: formatted });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch products", error: error.message });
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureProductsColumns();
    const rawId = String(req.params.id || "").trim();
    const isNumeric = /^\d+$/.test(rawId);

    const [rows]: any = await pool.query(
      `
      SELECT 
        p.*,
        sc.name AS sister_concern_name,
        sc.code AS sister_concern_code,
        pc.name AS category_name,
        psc.name AS sub_category_name,
        ptc.name AS tree_category_name,
        pb.name AS brand_name,
        pb.logo AS brand_logo,
        pm.name AS model_name,
        pm.model_number AS model_number
      FROM products p
      LEFT JOIN sister_concerns sc ON p.sister_concern_id = sc.id
      LEFT JOIN product_categories pc ON p.product_category_id = pc.id
      LEFT JOIN product_sub_categories psc ON p.product_sub_category_id = psc.id
      LEFT JOIN product_tree_categories ptc ON p.product_tree_category_id = ptc.id
      LEFT JOIN product_brands pb ON p.product_brand_id = pb.id
      LEFT JOIN product_models pm ON p.product_model_id = pm.id
      WHERE ${isNumeric ? "p.id = ?" : "p.slug = ? OR p.id = ?"}
      LIMIT 1
    `,
      isNumeric ? [Number(rawId)] : [rawId, 0]
    );

    if (!rows || rows.length === 0) {
      res.status(404).json({ success: false, message: "Product not found." });
      return;
    }

    const row = rows[0];
    const product = {
      ...row,
      features: safeJsonParse(row.features, []),
      gallery_images: safeJsonParse(row.gallery_images, []),
      datasheet_specs: safeJsonParse(row.datasheet_specs, []),
      brochures: safeJsonParse(row.brochures, []),
      translations: safeJsonParse(row.translations, {}),
      is_featured: Boolean(row.is_featured),
      is_upcoming: Boolean(row.is_upcoming),
    };

    res.json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch product", error: error.message });
  }
};

export const generateUniqueSku = async (): Promise<string> => {
  await ensureProductsColumns();

  // Find the highest 13-digit numeric SKU in the products table
  const [rows]: any = await pool.query(`
    SELECT sku FROM products 
    WHERE sku IS NOT NULL AND CHAR_LENGTH(sku) = 13 AND sku REGEXP '^[0-9]+$'
    ORDER BY sku DESC LIMIT 1
  `);

  const STARTING_BASE = 2026000000001n; // 13-digit base: Year 2026 + 9-digit serial counter

  if (rows && rows.length > 0 && rows[0].sku) {
    try {
      const highestSku = BigInt(rows[0].sku);
      let candidate = highestSku + 1n;
      let candidateStr = candidate.toString();
      const [exists]: any = await pool.query(`SELECT id FROM products WHERE sku = ? LIMIT 1`, [candidateStr]);
      while (exists && exists.length > 0) {
        candidate += 1n;
        candidateStr = candidate.toString();
      }
      return candidateStr;
    } catch (_) {}
  }

  // If no 13-digit SKU exists yet, establish next tracked serial from count
  const [countRows]: any = await pool.query(`SELECT COUNT(*) as total FROM products`);
  const totalCount = BigInt(countRows?.[0]?.total || 0);
  let candidate = STARTING_BASE + totalCount;
  let candidateStr = candidate.toString();
  const [exists]: any = await pool.query(`SELECT id FROM products WHERE sku = ? LIMIT 1`, [candidateStr]);
  while (exists && exists.length > 0) {
    candidate += 1n;
    candidateStr = candidate.toString();
  }
  return candidateStr;
};

export const getNextSku = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const nextSku = await generateUniqueSku();
    res.json({ success: true, sku: nextSku });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to generate SKU", error: error.message });
  }
};

export const createProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureProductsColumns();

    const {
      title,
      slug,
      category,
      sister_concern_id,
      product_category_id,
      product_sub_category_id,
      product_tree_category_id,
      product_brand_id,
      product_model_id,
      sku,
      price,
      stock,
      status,
      features,
      description,
      image,
      gallery_images,
      datasheet_pdf,
      datasheet_specs,
      brochures,
      is_featured,
      is_upcoming,
      translations,
    } = req.body;

    if (!title) {
      res.status(400).json({ success: false, message: "Product Title is required." });
      return;
    }

    const generatedSlug = (slug || title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const resolvedCategory = category || "Solar Solutions";
    const featuresJson = Array.isArray(features) ? JSON.stringify(features) : JSON.stringify([]);
    const galleryImagesJson = Array.isArray(gallery_images) ? JSON.stringify(gallery_images) : JSON.stringify([]);
    const datasheetSpecsJson = Array.isArray(datasheet_specs) ? JSON.stringify(datasheet_specs) : JSON.stringify([]);
    const brochuresJson = Array.isArray(brochures) ? JSON.stringify(brochures) : JSON.stringify([]);
    const translationsJson = translations ? JSON.stringify(translations) : JSON.stringify({});

    // 13-Digit Tracked & Unique SKU resolution
    let finalSku = sku;
    if (!finalSku || String(finalSku).length !== 13 || !/^\d{13}$/.test(String(finalSku))) {
      finalSku = await generateUniqueSku();
    } else {
      const [existing]: any = await pool.query(`SELECT id FROM products WHERE sku = ? LIMIT 1`, [finalSku]);
      if (existing && existing.length > 0) {
        finalSku = await generateUniqueSku();
      }
    }

    const isUpcomingBool = Boolean(is_upcoming);
    const finalStock = isUpcomingBool ? 0 : (Number(stock) || 0);

    const [result]: any = await pool.query(
      `
      INSERT INTO products (
        title, slug, category, sister_concern_id, product_category_id,
        product_sub_category_id, product_tree_category_id, product_brand_id,
        product_model_id, sku, price, stock, status, features,
        description, image, gallery_images, datasheet_pdf, datasheet_specs, brochures, is_featured, is_upcoming, translations
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        title,
        generatedSlug,
        resolvedCategory,
        sister_concern_id ? Number(sister_concern_id) : null,
        product_category_id ? Number(product_category_id) : null,
        product_sub_category_id ? Number(product_sub_category_id) : null,
        product_tree_category_id ? Number(product_tree_category_id) : null,
        product_brand_id ? Number(product_brand_id) : null,
        product_model_id ? Number(product_model_id) : null,
        finalSku,
        price ? price.toString() : "0.00",
        finalStock,
        status || "published",
        featuresJson,
        description || null,
        image || null,
        galleryImagesJson,
        datasheet_pdf || null,
        datasheetSpecsJson,
        brochuresJson,
        is_featured ? 1 : 0,
        isUpcomingBool ? 1 : 0,
        translationsJson,
      ]
    );

    try {
      await db.insert(activityLogs).values({
        userId: req.user?.id || 1,
        userName: req.user?.name || "Admin",
        action: `Created Product: ${title}`,
        details: `ID: ${result.insertId}, Category: ${resolvedCategory}, Stock: ${finalStock}, Upcoming: ${isUpcomingBool}`,
        ipAddress: req.ip || "127.0.0.1",
      });
    } catch (_) {}

    res.status(201).json({
      success: true,
      message: "Product created successfully.",
      productId: result.insertId,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to create product", error: error.message });
  }
};

export const updateProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureProductsColumns();
    const { id } = req.params;

    const {
      title,
      slug,
      category,
      sister_concern_id,
      product_category_id,
      product_sub_category_id,
      product_tree_category_id,
      product_brand_id,
      product_model_id,
      sku,
      price,
      stock,
      status,
      features,
      description,
      image,
      gallery_images,
      datasheet_pdf,
      datasheet_specs,
      brochures,
      is_featured,
      is_upcoming,
      translations,
    } = req.body;

    const generatedSlug = (slug || title || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const featuresJson = Array.isArray(features) ? JSON.stringify(features) : undefined;
    const galleryImagesJson = Array.isArray(gallery_images) ? JSON.stringify(gallery_images) : undefined;
    const datasheetSpecsJson = Array.isArray(datasheet_specs) ? JSON.stringify(datasheet_specs) : undefined;
    const brochuresJson = Array.isArray(brochures) ? JSON.stringify(brochures) : undefined;
    const translationsJson = translations !== undefined ? JSON.stringify(translations) : undefined;

    const resolvedStock = is_upcoming === true ? 0 : (stock !== undefined ? Number(stock) : undefined);

    await pool.query(
      `
      UPDATE products SET
        title = COALESCE(?, title),
        slug = COALESCE(?, slug),
        category = COALESCE(?, category),
        sister_concern_id = ?,
        product_category_id = ?,
        product_sub_category_id = ?,
        product_tree_category_id = ?,
        product_brand_id = ?,
        product_model_id = ?,
        sku = ?,
        price = COALESCE(?, price),
        stock = COALESCE(?, stock),
        status = COALESCE(?, status),
        features = COALESCE(?, features),
        description = ?,
        image = ?,
        gallery_images = COALESCE(?, gallery_images),
        datasheet_pdf = ?,
        datasheet_specs = COALESCE(?, datasheet_specs),
        brochures = COALESCE(?, brochures),
        is_featured = ?,
        is_upcoming = COALESCE(?, is_upcoming),
        translations = COALESCE(?, translations)
      WHERE id = ?
    `,
      [
        title || null,
        generatedSlug || null,
        category || null,
        sister_concern_id ? Number(sister_concern_id) : null,
        product_category_id ? Number(product_category_id) : null,
        product_sub_category_id ? Number(product_sub_category_id) : null,
        product_tree_category_id ? Number(product_tree_category_id) : null,
        product_brand_id ? Number(product_brand_id) : null,
        product_model_id ? Number(product_model_id) : null,
        sku || null,
        price !== undefined ? price.toString() : null,
        resolvedStock !== undefined ? resolvedStock : null,
        status || null,
        featuresJson || null,
        description !== undefined ? description : null,
        image !== undefined ? image : null,
        galleryImagesJson || null,
        datasheet_pdf !== undefined ? datasheet_pdf : null,
        datasheetSpecsJson || null,
        brochuresJson || null,
        is_featured ? 1 : 0,
        is_upcoming !== undefined ? (is_upcoming ? 1 : 0) : null,
        translationsJson !== undefined ? translationsJson : null,
        Number(id),
      ]
    );

    try {
      await db.insert(activityLogs).values({
        userId: req.user?.id || 1,
        userName: req.user?.name || "Admin",
        action: `Updated Product ID #${id}`,
        details: title ? `Title: ${title}` : undefined,
        ipAddress: req.ip || "127.0.0.1",
      });
    } catch (_) {}

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
