const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

async function inspectDb() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "solvex_db",
  });

  const [tables] = await conn.query("SHOW TABLES");
  const tableNames = tables.map(t => Object.values(t)[0]);

  console.log("==========================================================================================");
  console.log("DATABASE AUDIT: " + (process.env.DB_NAME || "solvex_db"));
  console.log("==========================================================================================");

  for (const table of tableNames) {
    const [indexes] = await conn.query("SHOW INDEX FROM " + table);
    const indexDetails = indexes.map(i => `${i.Key_name}(${i.Column_name})`);
    const [status] = await conn.query("SHOW TABLE STATUS LIKE '" + table + "'");
    const [count] = await conn.query("SELECT COUNT(*) as c FROM " + table);
    const engine = status[0]?.Engine || "InnoDB";
    const collation = status[0]?.Collation || "";
    
    console.log(`${table.padEnd(28)} | Engine: ${engine} | Rows: ${String(count[0].c).padStart(4)} | Indexes: ${indexes.length > 0 ? [...new Set(indexes.map(i => i.Key_name))].join(", ") : "NONE"}`);
  }

  await conn.end();
}

inspectDb().catch(console.error);
