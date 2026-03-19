import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchChartData, type NativeFilterInput } from "@/lib/chart-query";
import type { ApiResponse, ChartComponentProps, FilterContext } from "@/types";

/**
 * GET /api/charts/[id]/data
 *
 * Fetches chart-ready data for a saved chart.
 *
 * Query params:
 *  - Any non-reserved key=value pair: applied as cross-filter WHERE conditions
 *  - __nf__: JSON-encoded NativeFilterInput[] for typed native filter bar filters
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
    const searchParams = new URL(req.url).searchParams;

    // Parse cross-filter params (skip reserved and internal params)
    const reserved = new Set(["page", "pageSize", "q", "__nf__"]);
    const filters: FilterContext = {};
    for (const [key, value] of searchParams) {
      if (!reserved.has(key)) filters[key] = value;
    }

    // Parse native filter bar filters encoded as JSON
    let nativeFilters: NativeFilterInput[] = [];
    const nfRaw = searchParams.get("__nf__");
    if (nfRaw) {
      try {
        const parsed = JSON.parse(nfRaw);
        if (Array.isArray(parsed)) {
          nativeFilters = parsed as NativeFilterInput[];
        }
      } catch {
        // Malformed __nf__ param — ignore, proceed without native filters
      }
    }

    const data = await fetchChartData(id, session.user.id, filters, nativeFilters);

    return NextResponse.json<ApiResponse<ChartComponentProps>>({ data, error: null });
  } catch (err) {
    console.error("[GET /api/charts/[id]/data]", err);
    const message = err instanceof Error ? err.message : "Failed to fetch chart data";
    return NextResponse.json<ApiResponse<null>>({ data: null, error: message }, { status: 500 });
  }
}
