import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchChartData } from "@/lib/chart-query";
import type { ApiResponse, ChartComponentProps, FilterContext } from "@/types";

/**
 * GET /api/charts/[id]/data
 * Fetches chart-ready data for a saved chart.
 * Supports filter query params for cross-filtering (e.g. ?region=North&product=A).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Parse any filter params passed as query string (skip pagination/reserved params)
    const reserved = new Set(["page", "pageSize", "q"]);
    const filters: FilterContext = {};
    for (const [key, value] of new URL(req.url).searchParams) {
      if (!reserved.has(key)) filters[key] = value;
    }

    const data = await fetchChartData(id, session.user.id, filters);

    return NextResponse.json<ApiResponse<ChartComponentProps>>({ data, error: null });
  } catch (err) {
    console.error("[GET /api/charts/[id]/data]", err);
    const message = err instanceof Error ? err.message : "Failed to fetch chart data";
    return NextResponse.json<ApiResponse<null>>({ data: null, error: message }, { status: 500 });
  }
}
