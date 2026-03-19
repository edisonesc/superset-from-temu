import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { desc } from "drizzle-orm";
import type { ApiResponse } from "@/types";

/**
 * GET /api/admin/users — list all users.
 * Admin only.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Forbidden" }, { status: 403 });
    }

    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return NextResponse.json<ApiResponse<typeof rows>>({ data: rows, error: null });
  } catch (err) {
    console.error("[GET /api/admin/users]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}
