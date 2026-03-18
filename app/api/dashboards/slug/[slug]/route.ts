import { NextResponse } from "next/server";
import { db } from "@/db";
import { dashboards, dashboardCharts, charts } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ApiResponse } from "@/types";

/**
 * GET /api/dashboards/slug/[slug]
 *
 * Returns a published dashboard by its human-readable slug.
 * No authentication required — supports public dashboard sharing.
 * Returns 404 if the dashboard does not exist or is not published.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const [dashboard] = await db
      .select()
      .from(dashboards)
      .where(eq(dashboards.slug, slug))
      .limit(1);

    if (!dashboard || !dashboard.isPublished) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Not found" },
        { status: 404 },
      );
    }

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
      .where(eq(dashboardCharts.dashboardId, dashboard.id));

    return NextResponse.json<ApiResponse<typeof dashboard & { charts: typeof panelCharts }>>({
      data: { ...dashboard, charts: panelCharts },
      error: null,
    });
  } catch (err) {
    console.error("[GET /api/dashboards/slug/[slug]]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Internal server error" },
      { status: 500 },
    );
  }
}
