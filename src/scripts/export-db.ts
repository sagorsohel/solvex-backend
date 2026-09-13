import mysql from "mysql2/promise";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

async function exportDatabase() {
  const host = process.env.DB_HOST || "localhost";
  const port = Number(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";
  const database = process.env.DB_NAME || "solvex_db";

  console.log(`Connecting to MySQL database '${database}' on ${host}:${port}...`);
  const conn = await mysql.createConnection({ host, port, user, password, database });

  const [tables] = await conn.query("SHOW TABLES") as any;
  const tableNames: string[] = tables.map((t: any) => Object.values(t)[0]);

  let sqlOutput = `-- Solvex Database Export
-- Generated for Hostinger Deployment
-- Date: ${new Date().toISOString()}

SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

`;

  for (const tableName of tableNames) {
    console.log(`Exporting table: ${tableName}`);
    sqlOutput += `--\n-- Table structure for table \`${tableName}\`\n--\n\n`;
    sqlOutput += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;

    const [createTableResult] = await conn.query(`SHOW CREATE TABLE \`${tableName}\``) as any;
    const createSql = createTableResult[0]["Create Table"];
    sqlOutput += `${createSql};\n\n`;

    const [rows] = await conn.query(`SELECT * FROM \`${tableName}\``) as any;
    if (rows.length > 0) {
      sqlOutput += `--\n-- Dumping data for table \`${tableName}\` (${rows.length} rows)\n--\n\n`;
      for (const row of rows) {
        const columns = Object.keys(row).map((k) => `\`${k}\``).join(", ");
        const values = Object.values(row)
          .map((v) => {
            if (v === null || v === undefined) return "NULL";
            if (typeof v === "number" || typeof v === "boolean") return v ? 1 : 0;
            if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace("T", " ")}'`;
            if (typeof v === "object") {
              const str = JSON.stringify(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
              return `'${str}'`;
            }
            const str = String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
            return `'${str}'`;
          })
          .join(", ");

        sqlOutput += `INSERT INTO \`${tableName}\` (${columns}) VALUES (${values});\n`;
      }
      sqlOutput += "\n";
    }
  }

  sqlOutput += `SET FOREIGN_KEY_CHECKS=1;\n-- Export completed successfully.\n`;

  const outputPath = path.resolve(process.cwd(), "database_backup.sql");
  fs.writeFileSync(outputPath, sqlOutput, "utf8");
  console.log(`✅ Database exported successfully to: ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB)`);

  await conn.end();
}

exportDatabase().catch((err) => {
  console.error("❌ Export failed:", err);
  process.exit(1);
});
