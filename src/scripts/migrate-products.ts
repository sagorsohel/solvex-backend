import { pool } from "../db/index.js";
import { ensureProductsColumns } from "../controllers/product.controller.js";

async function run() {
  try {
    console.log("Starting products migration...");
    await ensureProductsColumns();
    const [rows]: any = await pool.query("DESCRIBE products");
    console.log("Current products table columns:", rows.map((r: any) => r.Field));
    console.log("Migration finished successfully.");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();
