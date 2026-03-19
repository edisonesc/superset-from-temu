#!/usr/bin/env node
/**
 * Marks existing Drizzle migrations as already applied.
 * Use when tables were created from SQL dumps but the __drizzle_migrations
 * tracking table doesn't reflect that.
 *
 * Run with: DATABASE_URL=... node scripts/mark-migrated.mjs
 */
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("ERROR: DATABASE_URL is not set");
  process.exit(1);
}

const connection = await mysql.createConnection(url);

// Create the migrations tracking table if it doesn't exist (same DDL drizzle uses)
await connection.execute(`
  CREATE TABLE IF NOT EXISTS \`__drizzle_migrations\` (
    id SERIAL PRIMARY KEY NOT NULL,
    hash text NOT NULL,
    created_at BIGINT
  )
`);

// Read the journal to get all migration entries
const journalPath = join(__dirname, "..", "drizzle", "meta", "_journal.json");
const journal = JSON.parse(readFileSync(journalPath, "utf8"));

for (const entry of journal.entries) {
  const sqlPath = join(__dirname, "..", "drizzle", `${entry.tag}.sql`);
  const sqlContent = readFileSync(sqlPath, "utf8");

  // Drizzle computes the hash as SHA256 of the SQL file content
  const hash = createHash("sha256").update(sqlContent).digest("hex");

  // Check if already recorded
  const [rows] = await connection.execute(
    "SELECT id FROM `__drizzle_migrations` WHERE hash = ?",
    [hash]
  );

  if (rows.length > 0) {
    console.log(`Migration already recorded: ${entry.tag}`);
    continue;
  }

  await connection.execute(
    "INSERT INTO `__drizzle_migrations` (hash, created_at) VALUES (?, ?)",
    [hash, entry.when]
  );
  console.log(`Marked as applied: ${entry.tag}`);
}

await connection.end();
console.log("Done. You can now run migrations safely.");
