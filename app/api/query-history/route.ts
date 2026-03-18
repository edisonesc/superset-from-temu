import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { queryHistory } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { PaginatedResponse } from "@/types";
import type { ApiResponse } from "@/types";

/**
 * GET /api/query-history
 * Returns paginated query history for the current user.
 * Query params: page, pageSize, connectionId (optional filter)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE))),
    );
    const connectionIdFilter = searchParams.get("connectionId");

    const userId = session.user.id;

    const conditions = [eq(queryHistory.executedBy, userId)];
    if (connectionIdFilter) {
      conditions.push(eq(queryHistory.connectionId, connectionIdFilter));
    }

    const whereClause = and(...conditions);

    const [rows, countRows] = await Promise.all([
      db
        .select()
        .from(queryHistory)
        .where(whereClause)
        .orderBy(desc(queryHistory.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select().from(queryHistory).where(whereClause),
    ]);

    const response: PaginatedResponse<(typeof rows)[number]> = {
      data: rows,
      total: countRows.length,
      page,
      pageSize,
    };

    return NextResponse.json<ApiResponse<typeof response>>({ data: response, error: null });
  } catch {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to fetch query history" },
      { status: 500 },
    );
  }
}
