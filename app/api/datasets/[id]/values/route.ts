import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { datasets, databaseConnections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cache } from "@/lib/redis";
import { decryptPassword } from "@/lib/crypto";
import type { ApiResponse } from "@/types";

/** Redis TTL for distinct column value lists (5 minutes). */
const VALUES_CACHE_TTL = 300;

/**
 * GET /api/datasets/[id]/values?column=<column>
 *
 * Returns up to 500 distinct values for a column from the dataset's backing table.
 * Used by the SelectWidget in the native filter bar to populate dropdown options.
 * Results are cached in Redis for 5 minutes.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const column = new URL(req.url).searchParams.get("column");

    if (!column) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "column query param is required" },
        { status: 400 },
      );
    }

    // Sanitise column name to prevent injection
    const safeColumn = column.replace(/[^a-zA-Z0-9_.]/g, "");
    if (!safeColumn) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Invalid column name" },
        { status: 400 },
      );
    }

    // Check Redis cache first
    const cacheKey = `dataset:${id}:values:${safeColumn}`;
    const cached = await cache.get<string[]>(cacheKey);
    if (cached) {
      return NextResponse.json<ApiResponse<{ values: string[] }>>({
        data: { values: cached },
        error: null,
      });
    }

    const [dataset] = await db
      .select()
      .from(datasets)
      .where(eq(datasets.id, id))
      .limit(1);

    if (!dataset) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Dataset not found" },
        { status: 404 },
      );
    }

    // Validate that the column exists in stored metadata (if available)
    if (dataset.columnMetadata) {
      const meta = dataset.columnMetadata as Array<{ name: string }>;
      const knownColumns = meta.map((c) => c.name);
      if (knownColumns.length > 0 && !knownColumns.includes(safeColumn)) {
        return NextResponse.json<ApiResponse<null>>(
          { data: null, error: `Column '${safeColumn}' not found in dataset` },
          { status: 400 },
        );
      }
    }

    const [connection] = await db
      .select()
      .from(databaseConnections)
      .where(eq(databaseConnections.id, dataset.connectionId))
      .limit(1);

    if (!connection) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Connection not found" },
        { status: 404 },
      );
    }

    const password = decryptPassword(connection.encryptedPassword);
    const source = dataset.sqlDefinition
      ? `(${dataset.sqlDefinition}) AS __ds__`
      : `\`${dataset.tableName}\``;

    const sql = `SELECT DISTINCT \`${safeColumn}\` FROM ${source} WHERE \`${safeColumn}\` IS NOT NULL ORDER BY \`${safeColumn}\` LIMIT 500`;

    let values: string[] = [];

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
      const [rows] = await conn.execute(sql);
      await conn.end();
      values = (rows as Record<string, unknown>[]).map((r) =>
        String(r[safeColumn] ?? ""),
      );
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
      const pgSql = `SELECT DISTINCT "${safeColumn}" FROM ${source} WHERE "${safeColumn}" IS NOT NULL ORDER BY "${safeColumn}" LIMIT 500`;
      const result = await client.query(pgSql);
      await client.end();
      values = result.rows.map((r) => String(r[safeColumn] ?? ""));
    }

    await cache.set(cacheKey, values, VALUES_CACHE_TTL);

    return NextResponse.json<ApiResponse<{ values: string[] }>>({
      data: { values },
      error: null,
    });
  } catch (err) {
    console.error("[GET /api/datasets/[id]/values]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to fetch column values" },
      { status: 500 },
    );
  }
}
