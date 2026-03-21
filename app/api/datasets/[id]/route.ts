import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { datasets, databaseConnections, charts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { ApiResponse } from "@/types";

const updateDatasetSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  connectionId: z.string().min(1).optional(),
  tableName: z.string().optional(),
  sqlDefinition: z.string().optional(),
  columnMetadata: z.array(z.record(z.string(), z.unknown())).optional(),
});

/**
 * GET /api/datasets/[id] — fetch a single dataset with connection info joined.
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

/** PUT /api/datasets/[id] — update dataset (alpha or admin only) */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Unauthorized" }, { status: 401 });
    }
    if (!["admin", "alpha"].includes(session.user.role)) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const [existing] = await db.select().from(datasets).where(eq(datasets.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Dataset not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateDatasetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if (parsed.data.tableName !== undefined) {
      updates.tableName = parsed.data.tableName;
      if (parsed.data.tableName !== existing.tableName) updates.columnMetadata = null;
    }
    if (parsed.data.sqlDefinition !== undefined) {
      updates.sqlDefinition = parsed.data.sqlDefinition;
      if (parsed.data.sqlDefinition !== existing.sqlDefinition) updates.columnMetadata = null;
    }
    if (parsed.data.columnMetadata !== undefined) updates.columnMetadata = parsed.data.columnMetadata;

    if (parsed.data.connectionId !== undefined) {
      // Verify the new connection exists
      const [conn] = await db
        .select({ id: databaseConnections.id })
        .from(databaseConnections)
        .where(eq(databaseConnections.id, parsed.data.connectionId))
        .limit(1);
      if (!conn) {
        return NextResponse.json<ApiResponse<null>>(
          { data: null, error: "Connection not found" },
          { status: 404 },
        );
      }
      updates.connectionId = parsed.data.connectionId;
      // Clear column metadata so the user re-syncs against the new connection
      updates.columnMetadata = null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json<ApiResponse<{ id: string }>>({ data: { id }, error: null });
    }

    await db.update(datasets).set(updates).where(eq(datasets.id, id));

    return NextResponse.json<ApiResponse<{ id: string }>>({ data: { id }, error: null });
  } catch (err) {
    console.error("[PUT /api/datasets/[id]]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to update dataset" },
      { status: 500 },
    );
  }
}

/** DELETE /api/datasets/[id] — delete dataset (alpha or admin only, 409 if charts depend on it) */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Unauthorized" }, { status: 401 });
    }
    if (!["admin", "alpha"].includes(session.user.role)) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const [existing] = await db.select().from(datasets).where(eq(datasets.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Dataset not found" }, { status: 404 });
    }

    // Check if any charts depend on this dataset
    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(charts)
      .where(eq(charts.datasetId, id));

    if (Number(countRow.count) > 0) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: `Cannot delete: ${countRow.count} chart(s) depend on this dataset` },
        { status: 409 },
      );
    }

    await db.delete(datasets).where(eq(datasets.id, id));

    return NextResponse.json<ApiResponse<{ id: string }>>({ data: { id }, error: null });
  } catch (err) {
    console.error("[DELETE /api/datasets/[id]]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to delete dataset" },
      { status: 500 },
    );
  }
}
