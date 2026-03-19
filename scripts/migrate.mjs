#!/usr/bin/env node
/**
 * Programmatic Drizzle migration runner.
 * Uses drizzle-orm/mysql2/migrator directly — no drizzle-kit CLI needed.
 * Run with: node scripts/migrate.mjs
 */
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = join(__dirname, "..", "drizzle");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("ERROR: DATABASE_URL is not set");
  process.exit(1);
}

console.log("Connecting to database...");
let connection;
try {
  connection = await mysql.createConnection(url);
} catch (err) {
  console.error("ERROR: Failed to connect to database:", err.message);
  process.exit(1);
}

console.log("Applying migrations from:", migrationsFolder);
try {
  const db = drizzle(connection);
  await migrate(db, { migrationsFolder });
  console.log("Migrations applied successfully.");
} catch (err) {
  console.error("ERROR: Migration failed:", err.message);
  if (err.cause) console.error("Caused by:", err.cause);
  await connection.end();
  process.exit(1);
}

await connection.end();
