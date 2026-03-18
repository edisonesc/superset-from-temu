import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { charts, datasets } from "@/db/schema";
import { eq, like, sql, desc } from "drizzle-orm";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { ApiResponse, PaginatedResponse } from "@/types";

const createChartSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  vizType: z.string().min(1),
  datasetId: z.string().min(1),
  config: z.record(z.string(), z.unknown()),
  queryContext: z.record(z.string(), z.unknown()).optional(),
});

/** GET /api/charts — paginated chart list with dataset name joined */
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
        id: charts.id,
        name: charts.name,
        description: charts.description,
        vizType: charts.vizType,
        datasetId: charts.datasetId,
        datasetName: datasets.name,
        config: charts.config,
        createdBy: charts.createdBy,
        createdAt: charts.createdAt,
        updatedAt: charts.updatedAt,
      })
      .from(charts)
      .leftJoin(datasets, eq(charts.datasetId, datasets.id))
      .orderBy(desc(charts.updatedAt))
      .limit(pageSize)
      .offset(offset);

    const rows = search
      ? await query.where(like(charts.name, `%${search}%`))
      : await query;

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(charts)
      .where(search ? like(charts.name, `%${search}%`) : sql`1=1`);

    return NextResponse.json<ApiResponse<PaginatedResponse<(typeof rows)[0]>>>({
      data: { data: rows, total: Number(countRow.count), page, pageSize },
      error: null,
    });
  } catch (err) {
    console.error("[GET /api/charts]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to fetch charts" },
      { status: 500 },
    );
  }
}

/** POST /api/charts — create a new chart (alpha or admin only) */
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
    const parsed = createChartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 },
      );
    }

    const { name, description, vizType, datasetId, config, queryContext } = parsed.data;

    // Verify dataset exists
    const [dataset] = await db.select().from(datasets).where(eq(datasets.id, datasetId)).limit(1);
    if (!dataset) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Dataset not found" }, { status: 404 });
    }

    const id = createId();
    await db.insert(charts).values({
      id,
      name,
      description,
      vizType,
      datasetId,
      config,
      queryContext: queryContext ?? null,
      createdBy: session.user.id,
    });

    return NextResponse.json<ApiResponse<{ id: string }>>({ data: { id }, error: null }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/charts]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to create chart" },
      { status: 500 },
    );
  }
}
