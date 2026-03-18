import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { databaseConnections } from "@/db/schema";
import { decryptPassword } from "@/lib/crypto";
import { testConnection } from "@/lib/query-runner";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import type { ApiResponse } from "@/types";

type Params = { params: Promise<{ id: string }> };

/** POST /api/connections/[id]/test — test an existing saved connection. */
export async function POST(_req: NextRequest, { params }: Params): Promise<NextResponse> {
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

    const password = decryptPassword(connection.encryptedPassword);
    const result = await testConnection({
      dialect: connection.dialect,
      host: connection.host,
      port: connection.port,
      databaseName: connection.databaseName,
      username: connection.username,
      password,
    });

    return NextResponse.json<ApiResponse<typeof result>>({ data: result, error: null });
  } catch {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to test connection" },
      { status: 500 },
    );
  }
}
