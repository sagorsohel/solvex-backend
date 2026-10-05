const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function optimizeFullDatabase() {
  console.log("==========================================================================");
  console.log("🚀 SOLVEX GLOBAL - COMPLETE DATABASE OPTIMIZATION ENGINE");
  console.log("==========================================================================");
  console.log(`Connecting to: ${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || 3306} / ${process.env.DB_NAME || "solvex_db"}`);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "solvex_db",
  });

  console.log("✓ Connected to MySQL database successfully!\n");

  // -------------------------------------------------------------------------
  // PHASE 1: Convert all MyISAM tables to InnoDB (Row-level locking & Buffer pool)
  // -------------------------------------------------------------------------
  console.log("📦 Phase 1: Converting MyISAM tables to high-performance InnoDB...");
  const [tables] = await conn.query("SHOW TABLES");
  const tableNames = tables.map((t) => Object.values(t)[0]);

  for (const table of tableNames) {
    if (table.startsWith("__")) continue;
    try {
      const [status] = await conn.query(`SHOW TABLE STATUS LIKE '${table}'`);
      const currentEngine = status[0]?.Engine;
      if (currentEngine && currentEngine.toLowerCase() === "myisam") {
        await conn.query(`ALTER TABLE \`${table}\` ENGINE = InnoDB`);
        console.log(`  ✓ Converted '${table}' from MyISAM -> InnoDB (Row-Level Locking enabled)`);
      } else {
        console.log(`  - '${table}' is already ${currentEngine}`);
      }
    } catch (err) {
      console.warn(`  ⚠️ Could not convert engine for '${table}': ${err.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // PHASE 2: Convert character sets to utf8mb4_unicode_ci (Clean Bengali & Emojis)
  // -------------------------------------------------------------------------
  console.log("\n🔤 Phase 2: Ensuring utf8mb4_unicode_ci collation across all tables...");
  for (const table of tableNames) {
    if (table.startsWith("__")) continue;
    try {
      await conn.query(`ALTER TABLE \`${table}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`  ✓ Table '${table}' collation set to utf8mb4_unicode_ci`);
    } catch (err) {
      console.warn(`  ⚠️ Could not update collation for '${table}': ${err.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // PHASE 3: Adding High-Performance Indexes for all queries
  // -------------------------------------------------------------------------
  console.log("\n⚡ Phase 3: Creating Compound & Foreign Key Indexes...");

  const addIndexIfNotExists = async (table, indexName, cols) => {
    try {
      const [existing] = await conn.query(`SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`, [indexName]);
      if (existing.length === 0) {
        await conn.query(`ALTER TABLE \`${table}\` ADD INDEX \`${indexName}\` (${cols})`);
        console.log(`  ✓ [${table}] Added index '${indexName}' (${cols})`);
      } else {
        console.log(`  - [${table}] Index '${indexName}' already active`);
      }
    } catch (err) {
      console.warn(`  ⚠️ Could not add index '${indexName}' on '${table}': ${err.message}`);
    }
  };

  // Products table
  await addIndexIfNotExists("products", "idx_products_status_featured_created", "`status`, `is_featured`, `created_at`, `id`");
  await addIndexIfNotExists("products", "idx_products_slug", "`slug`");
  await addIndexIfNotExists("products", "idx_products_category", "`category`");
  await addIndexIfNotExists("products", "idx_products_sister_concern", "`sister_concern_id`");
  await addIndexIfNotExists("products", "idx_products_category_id", "`product_category_id`");
  await addIndexIfNotExists("products", "idx_products_sub_category_id", "`product_sub_category_id`");
  await addIndexIfNotExists("products", "idx_products_tree_category_id", "`product_tree_category_id`");
  await addIndexIfNotExists("products", "idx_products_brand_id", "`product_brand_id`");
  await addIndexIfNotExists("products", "idx_products_model_id", "`product_model_id`");
  await addIndexIfNotExists("products", "idx_products_sku", "`sku`");

  // Services table
  await addIndexIfNotExists("services", "idx_services_status_order", "`status`, `order_index`, `id`");

  // Projects table
  await addIndexIfNotExists("projects", "idx_projects_status_order", "`status`, `order_index`, `id`");
  await addIndexIfNotExists("projects", "idx_projects_category", "`project_category_id`");

  // Project Categories table
  await addIndexIfNotExists("project_categories", "idx_proj_cat_status_website", "`status`, `show_in_website`");

  // Blogs table
  await addIndexIfNotExists("blogs", "idx_blogs_status_published", "`status`, `published_at`, `id`");
  await addIndexIfNotExists("blogs", "idx_blogs_category", "`category`");
  await addIndexIfNotExists("blogs", "idx_blogs_featured", "`is_featured`, `published_at`");

  // Board Members table
  await addIndexIfNotExists("board_members", "idx_board_display_order", "`display_in_website`, `order_index`, `id`");

  // Testimonials table
  await addIndexIfNotExists("testimonials", "idx_testimonials_status_order", "`status`, `order_index`, `id`");

  // Inquiries table
  await addIndexIfNotExists("inquiries", "idx_inquiries_status_created", "`status`, `created_at`, `id`");

  // Activity Logs table
  await addIndexIfNotExists("activity_logs", "idx_activity_logs_user_created", "`user_id`, `created_at`, `id`");

  // Sister Concerns & Product Category Hierarchy tables
  await addIndexIfNotExists("sister_concerns", "idx_sister_status_order", "`status`, `order_index`, `id`");
  await addIndexIfNotExists("sister_concerns", "idx_sister_code", "`code`");

  await addIndexIfNotExists("product_categories", "idx_prod_cat_sister_status_order", "`sister_concern_id`, `status`, `order_index`, `id`");
  await addIndexIfNotExists("product_categories", "idx_prod_cat_slug", "`slug`");

  await addIndexIfNotExists("product_sub_categories", "idx_prod_subcat_cat_status_order", "`product_category_id`, `status`, `order_index`, `id`");
  await addIndexIfNotExists("product_sub_categories", "idx_prod_subcat_slug", "`slug`");

  await addIndexIfNotExists("product_tree_categories", "idx_prod_tree_subcat_status_order", "`product_sub_category_id`, `status`, `order_index`, `id`");
  await addIndexIfNotExists("product_tree_categories", "idx_prod_tree_slug", "`slug`");

  await addIndexIfNotExists("product_brands", "idx_prod_brands_status_order", "`status`, `order_index`, `id`");
  await addIndexIfNotExists("product_brands", "idx_prod_brands_slug", "`slug`");

  await addIndexIfNotExists("product_models", "idx_prod_models_brand_status_order", "`brand_id`, `status`, `order_index`, `id`");
  await addIndexIfNotExists("product_models", "idx_prod_models_number", "`model_number`");

  // Users table
  await addIndexIfNotExists("users", "idx_users_status_role", "`status`, `role`");

  // Calculator tables
  await addIndexIfNotExists("calculator_appliances", "idx_appliances_active_order", "`is_active`, `order_index`, `id`");
  await addIndexIfNotExists("calculator_appliances", "idx_appliances_category", "`category`");
  await addIndexIfNotExists("calculator_solar_types", "idx_solar_active_order", "`is_active`, `order_index`, `id`");
  await addIndexIfNotExists("calculator_solar_types", "idx_solar_inverter", "`inverter_id`");
  await addIndexIfNotExists("calculator_battery_types", "idx_battery_active_order", "`is_active`, `order_index`, `id`");
  await addIndexIfNotExists("calculator_battery_types", "idx_battery_inverter", "`inverter_id`");
  await addIndexIfNotExists("calculator_recommendations", "idx_rec_active_watt", "`is_active`, `min_watt`, `order_index`");
  await addIndexIfNotExists("calculator_areas", "idx_areas_active_order", "`is_active`, `order_index`, `id`");
  await addIndexIfNotExists("calculator_areas", "idx_areas_inverter", "`inverter_id`");
  await addIndexIfNotExists("calculator_panels", "idx_panels_active_order", "`is_active`, `order_index`, `id`");
  await addIndexIfNotExists("calculator_panels", "idx_panels_inverter", "`inverter_id`");
  await addIndexIfNotExists("calculator_panels", "idx_panels_area", "`area_id`");
  await addIndexIfNotExists("calculator_accessories", "idx_accessories_active_order", "`is_active`, `order_index`, `id`");
  await addIndexIfNotExists("calculator_accessories", "idx_accessories_inverter", "`inverter_id`");
  await addIndexIfNotExists("calculator_packages", "idx_packages_active_order", "`is_active`, `order_index`, `id`");
  await addIndexIfNotExists("calculator_packages", "idx_packages_inverter", "`inverter_id`");
  await addIndexIfNotExists("calculator_packages", "idx_packages_panel", "`panel_id`");
  await addIndexIfNotExists("calculator_packages", "idx_packages_battery", "`battery_type_id`");
  await addIndexIfNotExists("calculator_packages", "idx_packages_accessory", "`accessory_id`");
  await addIndexIfNotExists("calculator_packages", "idx_packages_watt", "`min_watt`, `max_watt`");

  // -------------------------------------------------------------------------
  // PHASE 4: Run OPTIMIZE TABLE & ANALYZE TABLE (Defragment & update stats)
  // -------------------------------------------------------------------------
  console.log("\n🧹 Phase 4: Defragmenting tables and recalculating query statistics...");
  for (const table of tableNames) {
    if (table.startsWith("__")) continue;
    try {
      await conn.query(`ANALYZE TABLE \`${table}\``);
      await conn.query(`OPTIMIZE TABLE \`${table}\``);
      console.log(`  ✓ Optimized & Analyzed '${table}'`);
    } catch (err) {
      console.warn(`  ⚠️ Could not optimize table '${table}': ${err.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // PHASE 5: Generate Standalone SQL script for Hostinger / phpMyAdmin
  // -------------------------------------------------------------------------
  console.log("\n📝 Phase 5: Generating optimize_full_database.sql for Hostinger/phpMyAdmin...");
  const sqlScriptPath = path.resolve(__dirname, "optimize_full_database.sql");

  const sqlContent = `-- =========================================================================
-- SOLVEX GLOBAL - COMPLETE DATABASE OPTIMIZATION SCRIPT
-- Applies InnoDB Storage Engine (Row-level locking), utf8mb4_unicode_ci collation,
-- and optimal compound indexes across ALL 32 tables.
-- Run in phpMyAdmin or MySQL CLI for instant performance boost.
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";

-- 1. CONVERT ENGINES TO INNODB (Row-Level Locking & Buffer Pool Caching)
ALTER TABLE about_page_settings ENGINE = InnoDB;
ALTER TABLE activity_logs ENGINE = InnoDB;
ALTER TABLE board_members ENGINE = InnoDB;
ALTER TABLE homepage_settings ENGINE = InnoDB;
ALTER TABLE inquiries ENGINE = InnoDB;
ALTER TABLE product_brands ENGINE = InnoDB;
ALTER TABLE product_categories ENGINE = InnoDB;
ALTER TABLE product_models ENGINE = InnoDB;
ALTER TABLE product_sub_categories ENGINE = InnoDB;
ALTER TABLE product_tree_categories ENGINE = InnoDB;
ALTER TABLE products ENGINE = InnoDB;
ALTER TABLE project_categories ENGINE = InnoDB;
ALTER TABLE projects ENGINE = InnoDB;
ALTER TABLE projects_page_settings ENGINE = InnoDB;
ALTER TABLE services ENGINE = InnoDB;
ALTER TABLE services_page_settings ENGINE = InnoDB;
ALTER TABLE sister_concerns ENGINE = InnoDB;
ALTER TABLE users ENGINE = InnoDB;

-- 2. UNIFY CHARSET TO UTF8MB4_UNICODE_CI (Flawless Bengali & Emojis)
ALTER TABLE about_page_settings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE activity_logs CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE blogs CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE board_members CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE homepage_settings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE inquiries CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE page_headers CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE product_brands CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE product_categories CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE product_models CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE product_sub_categories CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE product_tree_categories CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE products CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE project_categories CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE projects CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE projects_page_settings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE services CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE services_page_settings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE sister_concerns CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE site_settings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE testimonials CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. PRODUCTS & CATALOG INDEXES
ALTER TABLE products ADD INDEX idx_products_status_featured_created (\`status\`, \`is_featured\`, \`created_at\`, \`id\`);
ALTER TABLE products ADD INDEX idx_products_slug (\`slug\`);
ALTER TABLE products ADD INDEX idx_products_category (\`category\`);
ALTER TABLE products ADD INDEX idx_products_sister_concern (\`sister_concern_id\`);
ALTER TABLE products ADD INDEX idx_products_category_id (\`product_category_id\`);
ALTER TABLE products ADD INDEX idx_products_sub_category_id (\`product_sub_category_id\`);
ALTER TABLE products ADD INDEX idx_products_tree_category_id (\`product_tree_category_id\`);
ALTER TABLE products ADD INDEX idx_products_brand_id (\`product_brand_id\`);
ALTER TABLE products ADD INDEX idx_products_model_id (\`product_model_id\`);
ALTER TABLE products ADD INDEX idx_products_sku (\`sku\`);

-- 4. SERVICES & PROJECTS INDEXES
ALTER TABLE services ADD INDEX idx_services_status_order (\`status\`, \`order_index\`, \`id\`);
ALTER TABLE projects ADD INDEX idx_projects_status_order (\`status\`, \`order_index\`, \`id\`);
ALTER TABLE projects ADD INDEX idx_projects_category (\`project_category_id\`);
ALTER TABLE project_categories ADD INDEX idx_proj_cat_status_website (\`status\`, \`show_in_website\`);

-- 5. BLOGS & CONTENT INDEXES
ALTER TABLE blogs ADD INDEX idx_blogs_status_published (\`status\`, \`published_at\`, \`id\`);
ALTER TABLE blogs ADD INDEX idx_blogs_category (\`category\`);
ALTER TABLE blogs ADD INDEX idx_blogs_featured (\`is_featured\`, \`published_at\`);

-- 6. BOARD MEMBERS & TESTIMONIALS INDEXES
ALTER TABLE board_members ADD INDEX idx_board_display_order (\`display_in_website\`, \`order_index\`, \`id\`);
ALTER TABLE testimonials ADD INDEX idx_testimonials_status_order (\`status\`, \`order_index\`, \`id\`);

-- 7. INQUIRIES & AUDIT LOGS INDEXES
ALTER TABLE inquiries ADD INDEX idx_inquiries_status_created (\`status\`, \`created_at\`, \`id\`);
ALTER TABLE activity_logs ADD INDEX idx_activity_logs_user_created (\`user_id\`, \`created_at\`, \`id\`);

-- 8. PRODUCT HIERARCHY & SISTER CONCERNS INDEXES
ALTER TABLE sister_concerns ADD INDEX idx_sister_status_order (\`status\`, \`order_index\`, \`id\`);
ALTER TABLE sister_concerns ADD INDEX idx_sister_code (\`code\`);
ALTER TABLE product_categories ADD INDEX idx_prod_cat_sister_status_order (\`sister_concern_id\`, \`status\`, \`order_index\`, \`id\`);
ALTER TABLE product_categories ADD INDEX idx_prod_cat_slug (\`slug\`);
ALTER TABLE product_sub_categories ADD INDEX idx_prod_subcat_cat_status_order (\`product_category_id\`, \`status\`, \`order_index\`, \`id\`);
ALTER TABLE product_sub_categories ADD INDEX idx_prod_subcat_slug (\`slug\`);
ALTER TABLE product_tree_categories ADD INDEX idx_prod_tree_subcat_status_order (\`product_sub_category_id\`, \`status\`, \`order_index\`, \`id\`);
ALTER TABLE product_tree_categories ADD INDEX idx_prod_tree_slug (\`slug\`);
ALTER TABLE product_brands ADD INDEX idx_prod_brands_status_order (\`status\`, \`order_index\`, \`id\`);
ALTER TABLE product_brands ADD INDEX idx_prod_brands_slug (\`slug\`);
ALTER TABLE product_models ADD INDEX idx_prod_models_brand_status_order (\`brand_id\`, \`status\`, \`order_index\`, \`id\`);
ALTER TABLE product_models ADD INDEX idx_prod_models_number (\`model_number\`);
ALTER TABLE users ADD INDEX idx_users_status_role (\`status\`, \`role\`);

-- 9. SOLAR SIZING CALCULATOR INDEXES
ALTER TABLE calculator_appliances ADD INDEX idx_appliances_active_order (\`is_active\`, \`order_index\`, \`id\`);
ALTER TABLE calculator_appliances ADD INDEX idx_appliances_category (\`category\`);
ALTER TABLE calculator_solar_types ADD INDEX idx_solar_active_order (\`is_active\`, \`order_index\`, \`id\`);
ALTER TABLE calculator_solar_types ADD INDEX idx_solar_inverter (\`inverter_id\`);
ALTER TABLE calculator_battery_types ADD INDEX idx_battery_active_order (\`is_active\`, \`order_index\`, \`id\`);
ALTER TABLE calculator_battery_types ADD INDEX idx_battery_inverter (\`inverter_id\`);
ALTER TABLE calculator_recommendations ADD INDEX idx_rec_active_watt (\`is_active\`, \`min_watt\`, \`order_index\`);
ALTER TABLE calculator_areas ADD INDEX idx_areas_active_order (\`is_active\`, \`order_index\`, \`id\`);
ALTER TABLE calculator_areas ADD INDEX idx_areas_inverter (\`inverter_id\`);
ALTER TABLE calculator_panels ADD INDEX idx_panels_active_order (\`is_active\`, \`order_index\`, \`id\`);
ALTER TABLE calculator_panels ADD INDEX idx_panels_inverter (\`inverter_id\`);
ALTER TABLE calculator_panels ADD INDEX idx_panels_area (\`area_id\`);
ALTER TABLE calculator_accessories ADD INDEX idx_accessories_active_order (\`is_active\`, \`order_index\`, \`id\`);
ALTER TABLE calculator_accessories ADD INDEX idx_accessories_inverter (\`inverter_id\`);
ALTER TABLE calculator_packages ADD INDEX idx_packages_active_order (\`is_active\`, \`order_index\`, \`id\`);
ALTER TABLE calculator_packages ADD INDEX idx_packages_inverter (\`inverter_id\`);
ALTER TABLE calculator_packages ADD INDEX idx_packages_panel (\`panel_id\`);
ALTER TABLE calculator_packages ADD INDEX idx_packages_battery (\`battery_type_id\`);
ALTER TABLE calculator_packages ADD INDEX idx_packages_accessory (\`accessory_id\`);
ALTER TABLE calculator_packages ADD INDEX idx_packages_watt (\`min_watt\`, \`max_watt\`);

-- 10. REBUILD AND OPTIMIZE ALL TABLES
ANALYZE TABLE products, services, projects, project_categories, blogs, board_members, testimonials, inquiries, activity_logs, sister_concerns, product_categories, product_sub_categories, product_tree_categories, product_brands, product_models, users, calculator_appliances, calculator_solar_types, calculator_battery_types, calculator_recommendations, calculator_areas, calculator_panels, calculator_accessories, calculator_packages, calculator_settings, homepage_settings, about_page_settings, services_page_settings, projects_page_settings, page_headers, site_settings;
OPTIMIZE TABLE products, services, projects, project_categories, blogs, board_members, testimonials, inquiries, activity_logs, sister_concerns, product_categories, product_sub_categories, product_tree_categories, product_brands, product_models, users, calculator_appliances, calculator_solar_types, calculator_battery_types, calculator_recommendations, calculator_areas, calculator_panels, calculator_accessories, calculator_packages, calculator_settings, homepage_settings, about_page_settings, services_page_settings, projects_page_settings, page_headers, site_settings;

SET FOREIGN_KEY_CHECKS = 1;
`;

  fs.writeFileSync(sqlScriptPath, sqlContent, "utf8");
  console.log(`  ✓ Generated: ${sqlScriptPath}`);

  console.log("\n==========================================================================");
  console.log("🎉 FULL DATABASE OPTIMIZATION COMPLETE!");
  console.log("==========================================================================");

  await conn.end();
}

optimizeFullDatabase().catch((err) => {
  console.error("❌ Optimization failed:", err);
  process.exit(1);
});
