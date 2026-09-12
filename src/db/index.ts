import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import * as schema from "./schema.js";

dotenv.config();

const poolConnection = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "solvex_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const pool = poolConnection;
export const db = drizzle(poolConnection, { schema, mode: "default" });

export async function testDbConnection(): Promise<boolean> {
  try {
    const connection = await poolConnection.getConnection();
    await connection.ping();
    connection.release();
    console.log("✅ Successfully connected to MySQL database via Drizzle ORM.");
    return true;
  } catch (error: any) {
    console.warn("⚠️ MySQL database connection warning:", error.message);
    console.warn("💡 Ensure MySQL server is running and database 'solvex_db' exists. (Run `npm run db:push` after creating DB).");
    return false;
  }
}
