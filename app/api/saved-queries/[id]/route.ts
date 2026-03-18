import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { savedQueries } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import type { ApiResponse } from "@/types";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  sql: z.string().min(1).optional(),
  connectionId: z.string().min(1).optional(),
});

type Params = { params: Promise<{ id: string }> };

/** PUT /api/saved-queries/[id] — update a saved query (owner only). */
export async function PUT(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }

    await db
      .update(savedQueries)
      .set(parsed.data)
      .where(and(eq(savedQueries.id, id), eq(savedQueries.createdBy, session.user.id)));

    return NextResponse.json<ApiResponse<{ id: string }>>({ data: { id }, error: null });
  } catch {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to update saved query" },
      { status: 500 },
    );
  }
}

/** DELETE /api/saved-queries/[id] — delete a saved query (owner only). */
export async function DELETE(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    await db
      .delete(savedQueries)
      .where(and(eq(savedQueries.id, id), eq(savedQueries.createdBy, session.user.id)));

    return NextResponse.json<ApiResponse<{ id: string }>>({ data: { id }, error: null });
  } catch {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to delete saved query" },
      { status: 500 },
    );
  }
}
