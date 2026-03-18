import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is missing. " +
      "Set it to a valid MySQL connection string, e.g. " +
      "mysql://user:password@127.0.0.1:3306/superset_meta"
  );
}

/**
 * Singleton mysql2 connection pool.
 * Re-used across the process lifetime to avoid connection exhaustion.
 */
const pool = mysql.createPool(process.env.DATABASE_URL);

/**
 * Drizzle ORM database client.
 * Import this in server-side code (API routes, Server Components, server actions).
 *
 * @example
 * import { db } from "@/db";
 * import { users } from "@/db/schema";
 * const rows = await db.select().from(users);
 */
export const db = drizzle(pool, { schema, mode: "default" });
