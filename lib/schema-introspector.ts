import { db } from "@/db";
import { databaseConnections } from "@/db/schema";
import { decryptPassword } from "@/lib/crypto";
import { cache } from "@/lib/redis";
import { eq } from "drizzle-orm";
import type { RowDataPacket } from "mysql2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Metadata about a database table. */
export type TableInfo = {
  name: string;
  schema: string;
  rowCount: number;
};

/** Metadata about a single column within a table. */
export type ColumnInfo = {
  name: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getConnection(connectionId: string) {
  const [connection] = await db
    .select()
    .from(databaseConnections)
    .where(eq(databaseConnections.id, connectionId))
    .limit(1);

  if (!connection) throw new Error("Connection not found");
  const password = decryptPassword(connection.encryptedPassword);
  return { connection, password };
}

// ---------------------------------------------------------------------------
// getTables
// ---------------------------------------------------------------------------

/**
 * Introspects a live database to discover all accessible tables.
 * Supports MySQL (INFORMATION_SCHEMA) and PostgreSQL (pg_catalog).
 * Results are cached in Redis for 60 seconds.
 *
 * @param connectionId - ID of the stored database_connection record
 * @returns Array of TableInfo objects
 */
export async function getTables(connectionId: string): Promise<TableInfo[]> {
  const cacheKey = `schema:${connectionId}:tables`;
  const cached = await cache.get<TableInfo[]>(cacheKey);
  if (cached) return cached;

  const { connection, password } = await getConnection(connectionId);

  let tables: TableInfo[] = [];

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

    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT TABLE_NAME as name, TABLE_SCHEMA as \`schema\`, TABLE_ROWS as rowCount
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`,
      [connection.databaseName],
    );
    await conn.end();

    tables = rows.map((r) => ({
      name: String(r.name),
      schema: String(r.schema),
      rowCount: Number(r.rowCount ?? 0),
    }));
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
    const result = await client.query(`
      SELECT c.relname AS name,
             n.nspname AS schema,
             c.reltuples::bigint AS rowcount
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY c.relname
    `);
    await client.end();

    tables = result.rows.map((r) => ({
      name: String(r.name),
      schema: String(r.schema),
      rowCount: Number(r.rowcount ?? 0),
    }));
  }

  await cache.set(cacheKey, tables, 60);
  return tables;
}

// ---------------------------------------------------------------------------
// getColumns
// ---------------------------------------------------------------------------

/**
 * Introspects a specific table to discover its column definitions.
 * Supports MySQL (INFORMATION_SCHEMA) and PostgreSQL (pg_catalog).
 * Results are cached in Redis for 60 seconds.
 *
 * @param connectionId - ID of the stored database_connection record
 * @param tableName - Name of the table to introspect
 * @returns Array of ColumnInfo objects
 */
export async function getColumns(
  connectionId: string,
  tableName: string,
): Promise<ColumnInfo[]> {
  const cacheKey = `schema:${connectionId}:${tableName}:columns`;
  const cached = await cache.get<ColumnInfo[]>(cacheKey);
  if (cached) return cached;

  const { connection, password } = await getConnection(connectionId);

  let columns: ColumnInfo[] = [];

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

    // Get columns
    const [colRows] = await conn.execute<RowDataPacket[]>(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [connection.databaseName, tableName],
    );

    // Get foreign key columns
    const [fkRows] = await conn.execute<RowDataPacket[]>(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [connection.databaseName, tableName],
    );
    await conn.end();

    const fkCols = new Set(fkRows.map((r) => String(r.COLUMN_NAME)));

    columns = colRows.map((r) => ({
      name: String(r.COLUMN_NAME),
      dataType: String(r.DATA_TYPE),
      nullable: r.IS_NULLABLE === "YES",
      isPrimaryKey: r.COLUMN_KEY === "PRI",
      isForeignKey: fkCols.has(String(r.COLUMN_NAME)),
    }));
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

    const result = await client.query(
      `SELECT
         c.column_name,
         c.data_type,
         c.is_nullable,
         CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_pk,
         CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END AS is_fk
       FROM information_schema.columns c
       LEFT JOIN (
         SELECT kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
         WHERE tc.constraint_type = 'PRIMARY KEY' AND kcu.table_name = $1
       ) pk ON pk.column_name = c.column_name
       LEFT JOIN (
         SELECT kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
         WHERE tc.constraint_type = 'FOREIGN KEY' AND kcu.table_name = $1
       ) fk ON fk.column_name = c.column_name
       WHERE c.table_name = $1
       ORDER BY c.ordinal_position`,
      [tableName],
    );
    await client.end();

    columns = result.rows.map((r) => ({
      name: String(r.column_name),
      dataType: String(r.data_type),
      nullable: r.is_nullable === "YES",
      isPrimaryKey: Boolean(r.is_pk),
      isForeignKey: Boolean(r.is_fk),
    }));
  }

  await cache.set(cacheKey, columns, 60);
  return columns;
}

// ---------------------------------------------------------------------------
// getRowCount
// ---------------------------------------------------------------------------

/**
 * Returns an estimated row count for a table.
 * Uses INFORMATION_SCHEMA for MySQL, pg_class for PostgreSQL (approximate).
 *
 * @param connectionId - ID of the stored database_connection record
 * @param tableName - Name of the table
 * @returns Estimated row count
 */
export async function getRowCount(
  connectionId: string,
  tableName: string,
): Promise<number> {
  const cacheKey = `schema:${connectionId}:${tableName}:rowcount`;
  const cached = await cache.get<number>(cacheKey);
  if (cached !== null && cached !== undefined) return cached;

  const { connection, password } = await getConnection(connectionId);

  let rowCount = 0;

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

    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT TABLE_ROWS FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [connection.databaseName, tableName],
    );
    await conn.end();
    rowCount = Number(rows[0]?.TABLE_ROWS ?? 0);
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
    const result = await client.query(
      `SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = $1`,
      [tableName],
    );
    await client.end();
    rowCount = Number(result.rows[0]?.estimate ?? 0);
  }

  await cache.set(cacheKey, rowCount, 60);
  return rowCount;
}
