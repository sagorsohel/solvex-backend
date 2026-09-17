import { pool, testDbConnection } from "../db/index.js";
import { ensureProductSettingsTables } from "../controllers/products-settings.controller.js";

async function main() {
  console.log("🌱 Running ensureProductSettingsTables()...");
  const ok = await testDbConnection();
  if (!ok) {
    console.error("DB connection failed");
    process.exit(1);
  }

  await ensureProductSettingsTables();
  console.log("✅ ensureProductSettingsTables() completed successfully!");

  const [sc]: any = await pool.query("SELECT id, name, code FROM sister_concerns");
  console.log("Sister Concerns:", sc);

  const [pc]: any = await pool.query("SELECT id, name FROM product_categories");
  console.log("Categories:", pc);

  const [brands]: any = await pool.query("SELECT id, name FROM product_brands");
  console.log("Brands:", brands);

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
