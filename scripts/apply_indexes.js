const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

async function applyIndexes() {
  console.log("🚀 Applying Solar Calculator Database Indexes...");
  console.log(`Connecting to: ${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || 3306} / ${process.env.DB_NAME || "solvex_db"}`);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "solvex_db",
  });

  const addIndexIfNotExists = async (table, indexName, cols) => {
    try {
      const [existing] = await conn.query(`SHOW INDEX FROM ${table} WHERE Key_name = ?`, [indexName]);
      if (existing.length === 0) {
        await conn.query(`ALTER TABLE ${table} ADD INDEX ${indexName} (${cols})`);
        console.log(`  ✓ Added index ${indexName} on ${table}`);
      } else {
        console.log(`  - Index ${indexName} already exists on ${table}`);
      }
    } catch (e) {
      console.warn(`  ⚠️ Could not add index on ${table} (${indexName}): ${e.message}`);
    }
  };

  await addIndexIfNotExists("calculator_appliances", "idx_appliances_active_order", "is_active, order_index, id");
  await addIndexIfNotExists("calculator_appliances", "idx_appliances_category", "category");
  await addIndexIfNotExists("calculator_solar_types", "idx_solar_active_order", "is_active, order_index, id");
  await addIndexIfNotExists("calculator_solar_types", "idx_solar_inverter", "inverter_id");
  await addIndexIfNotExists("calculator_battery_types", "idx_battery_active_order", "is_active, order_index, id");
  await addIndexIfNotExists("calculator_battery_types", "idx_battery_inverter", "inverter_id");
  await addIndexIfNotExists("calculator_recommendations", "idx_rec_active_watt", "is_active, min_watt, order_index");
  await addIndexIfNotExists("calculator_areas", "idx_areas_active_order", "is_active, order_index, id");
  await addIndexIfNotExists("calculator_areas", "idx_areas_inverter", "inverter_id");
  await addIndexIfNotExists("calculator_panels", "idx_panels_active_order", "is_active, order_index, id");
  await addIndexIfNotExists("calculator_panels", "idx_panels_inverter", "inverter_id");
  await addIndexIfNotExists("calculator_panels", "idx_panels_area", "area_id");
  await addIndexIfNotExists("calculator_accessories", "idx_accessories_active_order", "is_active, order_index, id");
  await addIndexIfNotExists("calculator_accessories", "idx_accessories_inverter", "inverter_id");
  await addIndexIfNotExists("calculator_packages", "idx_packages_active_order", "is_active, order_index, id");
  await addIndexIfNotExists("calculator_packages", "idx_packages_inverter", "inverter_id");
  await addIndexIfNotExists("calculator_packages", "idx_packages_panel", "panel_id");
  await addIndexIfNotExists("calculator_packages", "idx_packages_battery", "battery_type_id");
  await addIndexIfNotExists("calculator_packages", "idx_packages_accessory", "accessory_id");
  await addIndexIfNotExists("calculator_packages", "idx_packages_watt", "min_watt, max_watt");

  console.log("✅ All calculator indexes processed successfully!");
  await conn.end();
}

applyIndexes().catch((err) => {
  console.error("❌ Failed to apply indexes:", err);
  process.exit(1);
});
