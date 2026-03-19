import { db } from "@/db";
import { databaseConnections, queryHistory } from "@/db/schema";
import { decryptPassword } from "@/lib/crypto";
import { cache } from "@/lib/redis";
import { MAX_QUERY_ROWS, QUERY_CACHE_TTL_SECONDS } from "@/lib/constants";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { createHash } from "crypto";
import type { FieldPacket } from "mysql2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single column returned from a query execution. */
export type ColumnDefinition = {
  name: string;
  type: string;
};

/** The full result of a successful query execution. */
export type QueryResult = {
  columns: ColumnDefinition[];
  rows: Record<string, unknown>[];
  rowCount: number;
  durationMs: number;
};

/** Input for testing a connection before it is saved. */
export type TestConnectionInput = {
  dialect: "mysql" | "postgresql";
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password: string;
};

/** Result of a connectivity test. */
export type ConnectionTestResult = {
  success: boolean;
  message: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCacheKey(connectionId: string, sql: string): string {
  const hash = createHash("sha256").update(connectionId + ":" + sql).digest("hex");
  return `query:${hash}`;
}

/**
 * Appends LIMIT if the query is a SELECT and has no existing LIMIT clause.
 * Only modifies SELECT statements to avoid breaking DDL/DML.
 */
function enforceLimit(sql: string): string {
  const trimmed = sql.trim();
  if (!/^select\s/i.test(trimmed)) return sql;
  if (/\blimit\s+\d+/i.test(trimmed)) return sql;
  return `${trimmed} LIMIT ${MAX_QUERY_ROWS}`;
}

// ---------------------------------------------------------------------------
// runQuery
// ---------------------------------------------------------------------------

/**
 * Executes a SQL query against a stored data source connection.
 * Credentials are fetched from the metadata DB and decrypted server-side.
 * Results are cached in Redis for QUERY_CACHE_TTL_SECONDS.
 *
 * @param connectionId - ID of the stored database_connection record
 * @param sql - Raw SQL string from the user
 * @param userId - ID of the user executing the query (for history logging)
 * @returns Typed result rows and column definitions
 */
export async function runQuery(
  connectionId: string,
  sql: string,
  userId: string,
): Promise<QueryResult> {
  const cacheKey = buildCacheKey(connectionId, sql);
  const cached = await cache.get<QueryResult>(cacheKey);
  if (cached) return cached;

  const [connection] = await db
    .select()
    .from(databaseConnections)
    .where(eq(databaseConnections.id, connectionId))
    .limit(1);

  if (!connection) throw new Error("Connection not found");

  const password = decryptPassword(connection.encryptedPassword);
  const limitedSql = enforceLimit(sql);
  const start = Date.now();

  try {
    let result: QueryResult;

    if (connection.dialect === "mysql") {
      const mysql = await import("mysql2/promise");
      const conn = await mysql.createConnection({
        host: connection.host,
        port: connection.port,
        database: connection.databaseName,
        user: connection.username,
        password,
        connectTimeout: 10_000,
      });

      const [rows, fields] = await conn.execute(limitedSql);
      await conn.end();

      const durationMs = Date.now() - start;
      const columns: ColumnDefinition[] = (fields as FieldPacket[]).map((f) => ({
        name: f.name,
        type: String(f.type ?? "unknown"),
      }));

      result = {
        columns,
        rows: rows as Record<string, unknown>[],
        rowCount: (rows as unknown[]).length,
        durationMs,
      };
    } else {
      const { Client } = await import("pg");
      const client = new Client({
        host: connection.host,
        port: connection.port,
        database: connection.databaseName,
        user: connection.username,
        password,
        connectionTimeoutMillis: 10_000,
      });

      await client.connect();
      const pgResult = await client.query(limitedSql);
      await client.end();

      const durationMs = Date.now() - start;
      const columns: ColumnDefinition[] = pgResult.fields.map((f) => ({
        name: f.name,
        type: String(f.dataTypeID ?? "unknown"),
      }));

      result = {
        columns,
        rows: pgResult.rows,
        rowCount: pgResult.rows.length,
        durationMs,
      };
    }

    await db.insert(queryHistory).values({
      id: createId(),
      sql,
      connectionId,
      executedBy: userId,
      status: "success",
      rowCount: result.rowCount,
      durationMs: result.durationMs,
    });

    await cache.set(cacheKey, result, QUERY_CACHE_TTL_SECONDS);
    return result;
  } catch (err) {
    const durationMs = Date.now() - start;
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    await db
      .insert(queryHistory)
      .values({
        id: createId(),
        sql,
        connectionId,
        executedBy: userId,
        status: "error",
        durationMs,
        errorMessage,
      })
      .catch(() => undefined);

    // Never leak raw DB errors to the caller
    throw new Error(`Query execution failed: ${errorMessage}`);
  }
}

// ---------------------------------------------------------------------------
// testConnection
// ---------------------------------------------------------------------------

/**
 * Tests connectivity to a database without executing user SQL.
 * Used before saving a connection and via the test-connection API.
 *
 * @param connection - Partial connection config (before saving)
 * @returns { success, message }
 */
export async function testConnection(
  connection: TestConnectionInput,
): Promise<ConnectionTestResult> {
  try {
    if (connection.dialect === "mysql") {
      const mysql = await import("mysql2/promise");
      const conn = await mysql.createConnection({
        host: connection.host,
        port: connection.port,
        database: connection.databaseName,
        user: connection.username,
        password: connection.password,
        connectTimeout: 5_000,
      });
      await conn.ping();
      await conn.end();
    } else {
      const { Client } = await import("pg");
      const client = new Client({
        host: connection.host,
        port: connection.port,
        database: connection.databaseName,
        user: connection.username,
        password: connection.password,
        connectionTimeoutMillis: 5_000,
      });
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
    }

    return { success: true, message: "Connection successful" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Connection failed: ${msg}` };
  }
}
