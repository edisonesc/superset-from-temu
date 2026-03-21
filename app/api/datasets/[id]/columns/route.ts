import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { datasets, databaseConnections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cache } from "@/lib/redis";
import { getColumns } from "@/lib/schema-introspector";
import { decryptPassword } from "@/lib/crypto";
import type { ApiResponse } from "@/types";
import type { FieldPacket } from "mysql2";

type ColumnInfo = {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  is_temporal?: boolean;
  is_filterable?: boolean;
  is_groupable?: boolean;
};

/**
 * GET /api/datasets/[id]/columns
 *
 * Priority order:
 *  1. Redis cache
 *  2. Stored columnMetadata on the dataset record
 *  3. Live introspection via schema-introspector (physical tables)
 *  4. Execute SQL with LIMIT 0 to derive columns (virtual/SQL datasets)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const cacheKey = `dataset:columns:${id}`;

    // 1. Redis cache
    const cached = await cache.get<ColumnInfo[]>(cacheKey);
    if (cached) {
      return NextResponse.json<ApiResponse<ColumnInfo[]>>({ data: cached, error: null });
    }

    const [dataset] = await db.select().from(datasets).where(eq(datasets.id, id)).limit(1);
    if (!dataset) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Dataset not found" }, { status: 404 });
    }

    // 2. Stored columnMetadata
    if (dataset.columnMetadata) {
      const cols = dataset.columnMetadata as ColumnInfo[];
      await cache.set(cacheKey, cols, 60);
      return NextResponse.json<ApiResponse<ColumnInfo[]>>({ data: cols, error: null });
    }

    // Load connection for paths 3 & 4
    const [connection] = await db
      .select()
      .from(databaseConnections)
      .where(eq(databaseConnections.id, dataset.connectionId))
      .limit(1);

    if (!connection) {
      return NextResponse.json<ApiResponse<ColumnInfo[]>>({ data: [], error: null });
    }

    // 3. Physical table — use schema introspector directly
    if (dataset.tableName) {
      const introspected = await getColumns(dataset.connectionId, dataset.tableName);
      const cols: ColumnInfo[] = introspected.map((c) => ({
        name: c.name,
        type: c.dataType,
        nullable: c.nullable,
        isPrimaryKey: c.isPrimaryKey,
        isForeignKey: c.isForeignKey,
      }));
      await cache.set(cacheKey, cols, 60);
      return NextResponse.json<ApiResponse<ColumnInfo[]>>({ data: cols, error: null });
    }

    // 4. Virtual dataset — execute SQL with LIMIT 0 to derive column names/types
    if (dataset.sqlDefinition) {
      const password = decryptPassword(connection.encryptedPassword);
      const limitZeroSql = `SELECT * FROM (${dataset.sqlDefinition}) AS __v__ LIMIT 0`;
      let cols: ColumnInfo[] = [];

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
        const [, fields] = await conn.execute(limitZeroSql);
        await conn.end();
        cols = (fields as FieldPacket[]).map((f) => ({
          name: f.name,
          type: String(f.type ?? "unknown"),
          nullable: true,
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
        const result = await client.query(limitZeroSql);
        await client.end();
        cols = result.fields.map((f) => ({
          name: f.name,
          type: String(f.dataTypeID ?? "unknown"),
          nullable: true,
        }));
      }

      await cache.set(cacheKey, cols, 60);
      return NextResponse.json<ApiResponse<ColumnInfo[]>>({ data: cols, error: null });
    }

    return NextResponse.json<ApiResponse<ColumnInfo[]>>({ data: [], error: null });
  } catch (err) {
    console.error("[GET /api/datasets/[id]/columns]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to fetch columns" },
      { status: 500 },
    );
  }
}
