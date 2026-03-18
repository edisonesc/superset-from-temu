import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { datasets, databaseConnections } from "@/db/schema";
import { eq, like, sql, desc } from "drizzle-orm";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { ApiResponse, PaginatedResponse } from "@/types";

const createDatasetSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  connectionId: z.string().min(1),
  tableName: z.string().optional(),
  sqlDefinition: z.string().optional(),
  columnMetadata: z.array(z.record(z.string(), z.unknown())).optional(),
});

/**
 * GET /api/datasets — paginated dataset list with connection name joined.
 * Full CRUD is implemented in Phase 5; this endpoint is needed by the ChartBuilder.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10));
    const search = searchParams.get("q") ?? "";
    const offset = (page - 1) * pageSize;

    const query = db
      .select({
        id: datasets.id,
        name: datasets.name,
        description: datasets.description,
        connectionId: datasets.connectionId,
        connectionName: databaseConnections.name,
        tableName: datasets.tableName,
        sqlDefinition: datasets.sqlDefinition,
        columnMetadata: datasets.columnMetadata,
        createdBy: datasets.createdBy,
        createdAt: datasets.createdAt,
        updatedAt: datasets.updatedAt,
      })
      .from(datasets)
      .leftJoin(databaseConnections, eq(datasets.connectionId, databaseConnections.id))
      .orderBy(desc(datasets.updatedAt))
      .limit(pageSize)
      .offset(offset);

    const rows = search
      ? await query.where(like(datasets.name, `%${search}%`))
      : await query;

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(datasets)
      .where(search ? like(datasets.name, `%${search}%`) : sql`1=1`);

    return NextResponse.json<ApiResponse<PaginatedResponse<(typeof rows)[0]>>>({
      data: { data: rows, total: Number(countRow.count), page, pageSize },
      error: null,
    });
  } catch (err) {
    console.error("[GET /api/datasets]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to fetch datasets" },
      { status: 500 },
    );
  }
}

/** POST /api/datasets — create a new dataset (alpha or admin only) */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Unauthorized" }, { status: 401 });
    }
    if (!["admin", "alpha"].includes(session.user.role)) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createDatasetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 },
      );
    }

    const { name, description, connectionId, tableName, sqlDefinition, columnMetadata } = parsed.data;

    // Verify connection exists
    const [connection] = await db
      .select()
      .from(databaseConnections)
      .where(eq(databaseConnections.id, connectionId))
      .limit(1);
    if (!connection) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Connection not found" }, { status: 404 });
    }

    if (!tableName && !sqlDefinition) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Either tableName or sqlDefinition is required" },
        { status: 400 },
      );
    }

    const id = createId();
    await db.insert(datasets).values({
      id,
      name,
      description,
      connectionId,
      tableName: tableName ?? null,
      sqlDefinition: sqlDefinition ?? null,
      columnMetadata: columnMetadata ?? null,
      createdBy: session.user.id,
    });

    return NextResponse.json<ApiResponse<{ id: string }>>({ data: { id }, error: null }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/datasets]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to create dataset" },
      { status: 500 },
    );
  }
}
