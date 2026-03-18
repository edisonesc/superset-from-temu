import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { datasets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { buildChartQuery } from "@/lib/chart-query";
import { runQuery } from "@/lib/query-runner";
import type { ApiResponse, ChartComponentProps, ChartConfig, Row } from "@/types";

const previewSchema = z.object({
  datasetId: z.string().min(1),
  vizType: z.string().min(1),
  config: z.record(z.string(), z.unknown()),
});

/**
 * POST /api/charts/preview
 * Executes a chart query without saving and returns chart-ready data.
 * Used by the ChartBuilder for live preview.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = previewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 },
      );
    }

    const { datasetId, vizType, config } = parsed.data;

    const [dataset] = await db.select().from(datasets).where(eq(datasets.id, datasetId)).limit(1);
    if (!dataset) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Dataset not found" }, { status: 404 });
    }

    // Build a synthetic chart object for buildChartQuery
    const fakeChart = { vizType, config } as { vizType: string; config: ChartConfig };
    const sql = buildChartQuery(fakeChart as Parameters<typeof buildChartQuery>[0], dataset);

    const result = await runQuery(dataset.connectionId, sql, session.user.id);

    const props: ChartComponentProps = {
      data: result.rows as Row[],
      config: config as ChartConfig,
    };

    return NextResponse.json<ApiResponse<ChartComponentProps>>({ data: props, error: null });
  } catch (err) {
    console.error("[POST /api/charts/preview]", err);
    const message = err instanceof Error ? err.message : "Preview failed";
    return NextResponse.json<ApiResponse<null>>({ data: null, error: message }, { status: 500 });
  }
}
