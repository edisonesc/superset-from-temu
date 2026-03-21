import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runQuery } from "@/lib/query-runner";
import { auth } from "@/lib/auth";
import type { ApiResponse } from "@/types";
import type { QueryResult } from "@/lib/query-runner";

const bodySchema = z.object({
  connectionId: z.string().min(1),
  sql: z.string().min(1),
  bypassCache: z.boolean().optional(),
});

/**
 * POST /api/query
 * Executes a SQL query against a saved connection.
 * Requires an authenticated session.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }

    // SQL Lab always bypasses cache so users see fresh results on every run
    const result = await runQuery(parsed.data.connectionId, parsed.data.sql, session.user.id, parsed.data.bypassCache ?? true);
    return NextResponse.json<ApiResponse<QueryResult>>({ data: result, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Query failed";
    return NextResponse.json<ApiResponse<null>>({ data: null, error: message }, { status: 400 });
  }
}
