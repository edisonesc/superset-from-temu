import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { databaseConnections } from "@/db/schema";
import { encryptPassword } from "@/lib/crypto";
import { testConnection } from "@/lib/query-runner";
import { auth } from "@/lib/auth";
import type { ApiResponse } from "@/types";
import { createId } from "@paralleldrive/cuid2";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const createConnectionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  dialect: z.enum(["mysql", "postgresql"]),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  databaseName: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
});

// ---------------------------------------------------------------------------
// GET /api/connections — list all connections (omit encrypted_password)
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const rows = await db.select().from(databaseConnections);
    const safe = rows.map(({ encryptedPassword: _pwd, ...rest }) => rest);

    return NextResponse.json<ApiResponse<typeof safe>>({ data: safe, error: null });
  } catch {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to fetch connections" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/connections — create connection
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
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

    const body = await req.json();
    const parsed = createConnectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }

    const { password, ...fields } = parsed.data;

    // Test connectivity before saving
    const testResult = await testConnection({ ...fields, password });
    if (!testResult.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: testResult.message },
        { status: 400 },
      );
    }

    const encryptedPassword = encryptPassword(password);
    const id = createId();

    await db.insert(databaseConnections).values({
      id,
      ...fields,
      encryptedPassword,
      createdBy: session.user.id,
    });

    return NextResponse.json<ApiResponse<{ id: string }>>(
      { data: { id }, error: null },
      { status: 201 },
    );
  } catch {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to create connection" },
      { status: 500 },
    );
  }
}
