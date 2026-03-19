import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { databaseConnections } from "@/db/schema";
import { decryptPassword } from "@/lib/crypto";
import { cache } from "@/lib/redis";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import type { ApiResponse } from "@/types";
import type { RowDataPacket } from "mysql2";

type Params = { params: Promise<{ id: string }> };

export type SchemaColumn = {
  name: string;
  dataType: string;
  nullable: boolean;
};

export type SchemaTable = {
  name: string;
  columns: SchemaColumn[];
};

/**
 * GET /api/connections/[id]/schema
 * Introspects the live database to return table + column metadata for the schema browser.
 * Results cached in Redis for 60 seconds.
 */
export async function GET(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;

    const cacheKey = `schema:${id}`;
    const cached = await cache.get<SchemaTable[]>(cacheKey);
    if (cached) {
      return NextResponse.json<ApiResponse<SchemaTable[]>>({ data: cached, error: null });
    }

    const [connection] = await db
      .select()
      .from(databaseConnections)
      .where(eq(databaseConnections.id, id))
      .limit(1);

    if (!connection) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Not found" },
        { status: 404 },
      );
    }

    const password = decryptPassword(connection.encryptedPassword);
    let tables: SchemaTable[] = [];

    if (connection.dialect === "mysql") {
      const mysql = await import("mysql2/promise");
      const conn = await mysql.createConnection({
        host: connection.host,
        port: connection.port,
        database: connection.databaseName,
        user: connection.username,
        password,
        connectTimeout: 5_000,
      });

      const [tableRows] = await conn.execute<RowDataPacket[]>(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
         ORDER BY TABLE_NAME`,
        [connection.databaseName],
      );

      tables = await Promise.all(
        tableRows.map(async (t) => {
          const tableName = t.TABLE_NAME as string;
          const [colRows] = await conn.execute<RowDataPacket[]>(
            `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
             ORDER BY ORDINAL_POSITION`,
            [connection.databaseName, tableName],
          );
          return {
            name: tableName,
            columns: colRows.map((c) => ({
              name: c.COLUMN_NAME as string,
              dataType: c.DATA_TYPE as string,
              nullable: c.IS_NULLABLE === "YES",
            })),
          };
        }),
      );

      await conn.end();
    } else {
      const { Client } = await import("pg");
      const client = new Client({
        host: connection.host,
        port: connection.port,
        database: connection.databaseName,
        user: connection.username,
        password,
        connectionTimeoutMillis: 5_000,
      });
      await client.connect();

      const tableResult = await client.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
         ORDER BY table_name`,
      );

      tables = await Promise.all(
        tableResult.rows.map(async ({ table_name }) => {
          const colResult = await client.query<{
            column_name: string;
            data_type: string;
            is_nullable: string;
          }>(
            `SELECT column_name, data_type, is_nullable
             FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = $1
             ORDER BY ordinal_position`,
            [table_name],
          );
          return {
            name: table_name,
            columns: colResult.rows.map((c) => ({
              name: c.column_name,
              dataType: c.data_type,
              nullable: c.is_nullable === "YES",
            })),
          };
        }),
      );

      await client.end();
    }

    await cache.set(cacheKey, tables, 60);
    return NextResponse.json<ApiResponse<SchemaTable[]>>({ data: tables, error: null });
  } catch {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to fetch schema" },
      { status: 500 },
    );
  }
}
