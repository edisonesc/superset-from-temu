import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { savedQueries } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { createId } from "@paralleldrive/cuid2";
import type { ApiResponse } from "@/types";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  sql: z.string().min(1),
  connectionId: z.string().min(1),
});

/** GET /api/saved-queries — list saved queries for the current user. */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const rows = await db
      .select()
      .from(savedQueries)
      .where(eq(savedQueries.createdBy, session.user.id));

    return NextResponse.json<ApiResponse<typeof rows>>({ data: rows, error: null });
  } catch {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to fetch saved queries" },
      { status: 500 },
    );
  }
}

/** POST /api/saved-queries — create a saved query. */
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
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }

    const id = createId();
    await db.insert(savedQueries).values({
      id,
      ...parsed.data,
      createdBy: session.user.id,
    });

    return NextResponse.json<ApiResponse<{ id: string }>>(
      { data: { id }, error: null },
      { status: 201 },
    );
  } catch {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to save query" },
      { status: 500 },
    );
  }
}
