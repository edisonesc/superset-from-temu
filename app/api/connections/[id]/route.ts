import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { databaseConnections } from "@/db/schema";
import { encryptPassword } from "@/lib/crypto";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import type { ApiResponse } from "@/types";

// ---------------------------------------------------------------------------
// Validation schema for updates (all fields optional)
// ---------------------------------------------------------------------------

const updateConnectionSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  dialect: z.enum(["mysql", "postgresql"]).optional(),
  host: z.string().min(1).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  databaseName: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
});

type Params = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/connections/[id]
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const [connection] = await db
      .select()
      .from(databaseConnections)
      .where(eq(databaseConnections.id, id))
      .limit(1);

    if (!connection) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Not found" },
        { status: 404 },
      );
    }

    const { encryptedPassword: _pwd, ...safe } = connection;
    return NextResponse.json<ApiResponse<typeof safe>>({ data: safe, error: null });
  } catch {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to fetch connection" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/connections/[id]
// ---------------------------------------------------------------------------

export async function PUT(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const role = session.user.role;
    if (role !== "admin" && role !== "alpha") {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Forbidden" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateConnectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }

    const { password, ...fields } = parsed.data;
    const updates: Record<string, unknown> = { ...fields };

    if (password) {
      updates.encryptedPassword = encryptPassword(password);
    }

    await db
      .update(databaseConnections)
      .set(updates)
      .where(eq(databaseConnections.id, id));

    return NextResponse.json<ApiResponse<{ id: string }>>({ data: { id }, error: null });
  } catch {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to update connection" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/connections/[id]
// ---------------------------------------------------------------------------

export async function DELETE(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const role = session.user.role;
    if (role !== "admin" && role !== "alpha") {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Forbidden" },
        { status: 403 },
      );
    }

    const { id } = await params;
    await db.delete(databaseConnections).where(eq(databaseConnections.id, id));

    return NextResponse.json<ApiResponse<{ id: string }>>({ data: { id }, error: null });
  } catch {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to delete connection" },
      { status: 500 },
    );
  }
}
