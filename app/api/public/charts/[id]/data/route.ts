import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { charts, datasets, dashboardCharts, dashboards } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cache } from "@/lib/redis";
import { runQuery } from "@/lib/query-runner";
import { QUERY_CACHE_TTL_SECONDS } from "@/lib/constants";
import { createHash } from "crypto";
import { buildChartQuery } from "@/lib/chart-query";
import type { ApiResponse, ChartComponentProps, FilterContext, Row, ChartConfig } from "@/types";

/**
 * GET /api/public/charts/[id]/data
 *
 * Public chart data endpoint — no authentication required.
 * Only serves data for charts that belong to at least one published dashboard.
 * Uses the chart creator's user ID for query history logging (valid FK).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Verify this chart belongs to at least one published dashboard
    const publishedRows = await db
      .select({ dashboardId: dashboards.id })
      .from(dashboardCharts)
      .innerJoin(dashboards, eq(dashboardCharts.dashboardId, dashboards.id))
      .where(eq(dashboardCharts.chartId, id))
      .limit(10);

    const isAccessible = publishedRows.some(() => true); // rows only exist for published dashboards via innerJoin

    // Double-check at least one is published (innerJoin doesn't filter by isPublished)
    let hasPublished = false;
    for (const row of publishedRows) {
      const [d] = await db
        .select({ isPublished: dashboards.isPublished })
        .from(dashboards)
        .where(eq(dashboards.id, row.dashboardId))
        .limit(1);
      if (d?.isPublished) {
        hasPublished = true;
        break;
      }
    }

    if (!hasPublished) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Not found" },
        { status: 404 },
      );
    }

    // Parse filter params (same format as authenticated endpoint)
    const reserved = new Set(["page", "pageSize", "q"]);
    const filters: FilterContext = {};
    for (const [key, value] of new URL(req.url).searchParams) {
      if (!reserved.has(key)) filters[key] = value;
    }

    // Check cache
    const cacheKey = `public:chart:${id}:${createHash("sha256").update(JSON.stringify(filters)).digest("hex")}`;
    const cached = await cache.get<ChartComponentProps>(cacheKey);
    if (cached) {
      return NextResponse.json<ApiResponse<ChartComponentProps>>({
        data: cached,
        error: null,
      });
    }

    // Fetch chart — grab createdBy for history logging (valid FK)
    const [chart] = await db
      .select()
      .from(charts)
      .where(eq(charts.id, id))
      .limit(1);
    if (!chart) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Not found" },
        { status: 404 },
      );
    }

    // Fetch dataset
    const [dataset] = await db
      .select()
      .from(datasets)
      .where(eq(datasets.id, chart.datasetId))
      .limit(1);
    if (!dataset) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Dataset not found" },
        { status: 404 },
      );
    }

    // Build SQL with optional cross-filters
    const baseSql = buildChartQuery(chart, dataset);
    let filteredSql = baseSql;

    if (Object.keys(filters).length > 0) {
      const conditions = Object.entries(filters)
        .filter(([, val]) => val !== null && val !== undefined)
        .map(([col, val]) => {
          const safeCol = col.replace(/[^a-zA-Z0-9_.]/g, "");
          if (!safeCol) return null;
          const safeVal = String(val).replace(/'/g, "''");
          return `\`${safeCol}\` = '${safeVal}'`;
        })
        .filter(Boolean) as string[];
      if (conditions.length > 0) {
        filteredSql = `SELECT * FROM (${baseSql}) AS __filtered__ WHERE ${conditions.join(" AND ")}`;
      }
    }

    // Use chart.createdBy as userId so query_history FK is valid
    const result = await runQuery(dataset.connectionId, filteredSql, chart.createdBy);

    const props: ChartComponentProps = {
      data: result.rows as Row[],
      config: chart.config as ChartConfig,
    };

    await cache.set(cacheKey, props, QUERY_CACHE_TTL_SECONDS);

    return NextResponse.json<ApiResponse<ChartComponentProps>>({
      data: props,
      error: null,
    });
  } catch (err) {
    console.error("[GET /api/public/charts/[id]/data]", err);
    const message =
      err instanceof Error ? err.message : "Failed to fetch chart data";
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: message },
      { status: 500 },
    );
  }
}
