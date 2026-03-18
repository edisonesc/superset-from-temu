import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { charts, datasets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { ApiResponse } from "@/types";

const updateChartSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  vizType: z.string().optional(),
  datasetId: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  queryContext: z.record(z.string(), z.unknown()).optional(),
});

/** GET /api/charts/[id] — fetch a single chart with dataset joined */
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
        id: charts.id,
        name: charts.name,
        description: charts.description,
        vizType: charts.vizType,
        datasetId: charts.datasetId,
        datasetName: datasets.name,
        connectionId: datasets.connectionId,
        config: charts.config,
        queryContext: charts.queryContext,
        createdBy: charts.createdBy,
        createdAt: charts.createdAt,
        updatedAt: charts.updatedAt,
      })
      .from(charts)
      .leftJoin(datasets, eq(charts.datasetId, datasets.id))
      .where(eq(charts.id, id))
      .limit(1);

    if (!row) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Chart not found" }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<typeof row>>({ data: row, error: null });
  } catch (err) {
    console.error("[GET /api/charts/[id]]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to fetch chart" },
      { status: 500 },
    );
  }
}

/** PUT /api/charts/[id] — update chart config (alpha or admin) */
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
    const [existing] = await db.select().from(charts).where(eq(charts.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Chart not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateChartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 },
      );
    }

    await db.update(charts).set(parsed.data).where(eq(charts.id, id));
    return NextResponse.json<ApiResponse<{ id: string }>>({ data: { id }, error: null });
  } catch (err) {
    console.error("[PUT /api/charts/[id]]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to update chart" },
      { status: 500 },
    );
  }
}

/** DELETE /api/charts/[id] — delete a chart (alpha or admin) */
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
    const [existing] = await db.select().from(charts).where(eq(charts.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Chart not found" }, { status: 404 });
    }

    await db.delete(charts).where(eq(charts.id, id));
    return NextResponse.json<ApiResponse<{ id: string }>>({ data: { id }, error: null });
  } catch (err) {
    console.error("[DELETE /api/charts/[id]]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to delete chart" },
      { status: 500 },
    );
  }
}
