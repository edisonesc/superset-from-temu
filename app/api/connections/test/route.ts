import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { testConnection } from "@/lib/query-runner";
import type { ApiResponse } from "@/types";

const schema = z.object({
  dialect: z.enum(["mysql", "postgresql"]),
  host: z.string().min(1),
  port: z.number().int().positive(),
  databaseName: z.string().min(1),
  username: z.string().min(1),
  password: z.string(),
});

/**
 * POST /api/connections/test
 * Tests a connection config without saving it.
 * Used by the new-connection form's "Test Connection" button.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 },
      );
    }

    const result = await testConnection(parsed.data);
    return NextResponse.json<ApiResponse<typeof result>>({ data: result, error: null });
  } catch (err) {
    console.error("[POST /api/connections/test]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Test failed" },
      { status: 500 },
    );
  }
}
