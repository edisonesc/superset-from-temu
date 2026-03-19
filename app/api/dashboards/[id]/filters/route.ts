import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { dashboards } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ApiResponse } from "@/types";
import type { FilterConfig } from "@/stores/filterStore";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const FilterConfigSchema = z.object({
  id: z.string().min(1),
  dashboardId: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["date_range", "select", "search"]),
  column: z.string().min(1),
  datasetId: z.string(),
  targetChartIds: z.array(z.string()),
});

const PutBodySchema = z.object({
  configs: z.array(FilterConfigSchema),
});

// ---------------------------------------------------------------------------
// GET /api/dashboards/[id]/filters
// ---------------------------------------------------------------------------

/**
 * Returns the filter configs stored on a dashboard.
 */
export async function GET(
  _req: NextRequest,
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
      .select({ filterConfig: dashboards.filterConfig })
      .from(dashboards)
      .where(eq(dashboards.id, id))
      .limit(1);

    if (!dashboard) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Not found" },
        { status: 404 },
      );
    }

    const configs = (dashboard.filterConfig as FilterConfig[]) ?? [];
    return NextResponse.json<ApiResponse<FilterConfig[]>>({
      data: configs,
      error: null,
    });
  } catch (err) {
    console.error("[GET /api/dashboards/[id]/filters]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/dashboards/[id]/filters
// ---------------------------------------------------------------------------

/**
 * Replaces the filter configs for a dashboard.
 * Requires alpha or admin role.
 */
export async function PUT(
  req: NextRequest,
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
    const parsed = PutBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: parsed.error.message },
        { status: 400 },
      );
    }

    await db
      .update(dashboards)
      .set({ filterConfig: parsed.data.configs })
      .where(eq(dashboards.id, id));

    return NextResponse.json<ApiResponse<FilterConfig[]>>({
      data: parsed.data.configs,
      error: null,
    });
  } catch (err) {
    console.error("[PUT /api/dashboards/[id]/filters]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Internal server error" },
      { status: 500 },
    );
  }
}
