import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { datasets, databaseConnections } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ApiResponse } from "@/types";

/**
 * GET /api/datasets/[id] — fetch a single dataset with connection info joined.
 * Full CRUD is implemented in Phase 5.
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

    const [row] = await db
      .select({
        id: datasets.id,
        name: datasets.name,
        description: datasets.description,
        connectionId: datasets.connectionId,
        connectionName: databaseConnections.name,
        dialect: databaseConnections.dialect,
        tableName: datasets.tableName,
        sqlDefinition: datasets.sqlDefinition,
        columnMetadata: datasets.columnMetadata,
        createdBy: datasets.createdBy,
        createdAt: datasets.createdAt,
        updatedAt: datasets.updatedAt,
      })
      .from(datasets)
      .leftJoin(databaseConnections, eq(datasets.connectionId, databaseConnections.id))
      .where(eq(datasets.id, id))
      .limit(1);

    if (!row) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Dataset not found" }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<typeof row>>({ data: row, error: null });
  } catch (err) {
    console.error("[GET /api/datasets/[id]]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to fetch dataset" },
      { status: 500 },
    );
  }
}
