import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { datasets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cache } from "@/lib/redis";
import type { ApiResponse } from "@/types";

type ColumnInfo = {
  name: string;
  type: string;
  nullable: boolean;
};

/**
 * GET /api/datasets/[id]/columns
 * Returns column metadata for a dataset.
 * Uses stored columnMetadata if available, otherwise introspects live from the connection schema API.
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

    // Check Redis cache first
    const cacheKey = `dataset:columns:${id}`;
    const cached = await cache.get<ColumnInfo[]>(cacheKey);
    if (cached) {
      return NextResponse.json<ApiResponse<ColumnInfo[]>>({ data: cached, error: null });
    }

    const [dataset] = await db.select().from(datasets).where(eq(datasets.id, id)).limit(1);
    if (!dataset) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Dataset not found" }, { status: 404 });
    }

    // Use stored column metadata if present
    if (dataset.columnMetadata) {
      const cols = dataset.columnMetadata as ColumnInfo[];
      await cache.set(cacheKey, cols, 60);
      return NextResponse.json<ApiResponse<ColumnInfo[]>>({ data: cols, error: null });
    }

    // Fall back: fetch from connection schema endpoint
    if (dataset.tableName) {
      const schemaRes = await fetch(
        `${process.env.NEXTAUTH_URL}/api/connections/${dataset.connectionId}/schema`,
        { headers: { cookie: _req.headers.get("cookie") ?? "" } },
      );
      if (schemaRes.ok) {
        const schemaData = await schemaRes.json();
        const tableInfo = schemaData?.data?.tables?.find(
          (t: { name: string }) => t.name === dataset.tableName,
        );
        if (tableInfo?.columns) {
          const cols: ColumnInfo[] = tableInfo.columns.map((c: { name: string; type: string }) => ({
            name: c.name,
            type: c.type,
            nullable: true,
          }));
          await cache.set(cacheKey, cols, 60);
          return NextResponse.json<ApiResponse<ColumnInfo[]>>({ data: cols, error: null });
        }
      }
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
