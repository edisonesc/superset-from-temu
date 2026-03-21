import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { dashboards, dashboardCharts, charts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import type { ApiResponse } from "@/types";

/** Shape of each panel in the dashboard layout JSON. */
type LayoutItem = {
  id: string;
  chartId: string;
  type?: string;
  content?: string;
  colSpan: number;
  rowSpan: number;
};

/** New tabbed layout format. */
type DashboardTab = { id: string; name: string; layout: LayoutItem[] };

/** Extract all chart panels from either layout format. */
function extractChartPanels(raw: unknown[]): LayoutItem[] {
  if (raw.length === 0) return [];
  const first = raw[0] as Record<string, unknown>;
  // Tabs format: array of { id, name, layout[] }
  if (typeof first.name === "string" && Array.isArray(first.layout)) {
    return (raw as DashboardTab[]).flatMap((t) => t.layout).filter(
      (p) => p.chartId && p.type !== "markdown",
    );
  }
  // Legacy flat format
  return (raw as LayoutItem[]).filter((p) => p.chartId && p.type !== "markdown");
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  layout: z.array(z.unknown()).optional(),
  filterConfig: z.array(z.unknown()).optional(),
  isPublished: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// GET /api/dashboards/[id]
// ---------------------------------------------------------------------------

/**
 * Returns a dashboard with its associated charts.
 */
export async function GET(
  _req: Request,
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

    const [dashboard] = await db
      .select()
      .from(dashboards)
      .where(eq(dashboards.id, id))
      .limit(1);

    if (!dashboard) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Not found" },
        { status: 404 },
      );
    }

    // Join dashboard_charts → charts for chart metadata
    const panelCharts = await db
      .select({
        panelId: dashboardCharts.id,
        chartId: dashboardCharts.chartId,
        position: dashboardCharts.position,
        chartName: charts.name,
        vizType: charts.vizType,
      })
      .from(dashboardCharts)
      .innerJoin(charts, eq(dashboardCharts.chartId, charts.id))
      .where(eq(dashboardCharts.dashboardId, id));

    return NextResponse.json<ApiResponse<typeof dashboard & { charts: typeof panelCharts }>>({
      data: { ...dashboard, charts: panelCharts },
      error: null,
    });
  } catch (err) {
    console.error("[GET /api/dashboards/[id]]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/dashboards/[id]
// ---------------------------------------------------------------------------

/**
 * Updates a dashboard. When layout is provided, syncs the dashboard_charts join table.
 * Requires alpha or admin role.
 */
export async function PUT(
  req: Request,
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

    const { role } = session.user;
    if (role !== "admin" && role !== "alpha") {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Forbidden" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: parsed.error.message },
        { status: 400 },
      );
    }

    // Build update object from provided fields only
    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.description !== undefined)
      updateData.description = parsed.data.description;
    if (parsed.data.layout !== undefined) updateData.layout = parsed.data.layout;
    if (parsed.data.filterConfig !== undefined)
      updateData.filterConfig = parsed.data.filterConfig;
    if (parsed.data.isPublished !== undefined)
      updateData.isPublished = parsed.data.isPublished;

    await db.update(dashboards).set(updateData).where(eq(dashboards.id, id));

    // Sync dashboard_charts join table when layout is updated
    if (parsed.data.layout !== undefined) {
      const chartPanels = extractChartPanels(parsed.data.layout as unknown[]);

      // Delete all existing dashboard_charts for this dashboard
      await db
        .delete(dashboardCharts)
        .where(eq(dashboardCharts.dashboardId, id));

      // Re-insert only chart panels (skip markdown and empty-chartId panels)
      if (chartPanels.length > 0) {
        await db.insert(dashboardCharts).values(
          chartPanels.map((item) => ({
            id: item.id ?? createId(),
            dashboardId: id,
            chartId: item.chartId,
            position: { colSpan: item.colSpan, rowSpan: item.rowSpan },
          })),
        );
      }
    }

    const [dashboard] = await db
      .select()
      .from(dashboards)
      .where(eq(dashboards.id, id))
      .limit(1);

    if (!dashboard) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Not found" },
        { status: 404 },
      );
    }

    return NextResponse.json<ApiResponse<typeof dashboard>>({
      data: dashboard,
      error: null,
    });
  } catch (err) {
    console.error("[PUT /api/dashboards/[id]]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/dashboards/[id]
// ---------------------------------------------------------------------------

/**
 * Deletes a dashboard and its chart associations.
 * Requires alpha or admin role.
 */
export async function DELETE(
  _req: Request,
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

    const { role } = session.user;
    if (role !== "admin" && role !== "alpha") {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Forbidden" },
        { status: 403 },
      );
    }

    const { id } = await params;

    // Remove chart associations first (FK constraint)
    await db
      .delete(dashboardCharts)
      .where(eq(dashboardCharts.dashboardId, id));
    await db.delete(dashboards).where(eq(dashboards.id, id));

    return NextResponse.json<ApiResponse<{ id: string }>>({
      data: { id },
      error: null,
    });
  } catch (err) {
    console.error("[DELETE /api/dashboards/[id]]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Internal server error" },
      { status: 500 },
    );
  }
}
