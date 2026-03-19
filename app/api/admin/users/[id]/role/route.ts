import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { ApiResponse, UserRole } from "@/types";
import { USER_ROLES } from "@/lib/constants";

const updateRoleSchema = z.object({
  role: z.enum([...USER_ROLES]),
});

/**
 * PUT /api/admin/users/[id]/role — update a user's role.
 * Admin only.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const body = await req.json();
    const parsed = updateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 },
      );
    }

    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json<ApiResponse<null>>({ data: null, error: "User not found" }, { status: 404 });
    }

    // Prevent admin from downgrading their own role
    if (id === session.user.id && parsed.data.role !== "admin") {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Cannot change your own role" },
        { status: 400 },
      );
    }

    await db.update(users).set({ role: parsed.data.role as UserRole }).where(eq(users.id, id));

    return NextResponse.json<ApiResponse<{ id: string; role: string }>>({
      data: { id, role: parsed.data.role },
      error: null,
    });
  } catch (err) {
    console.error("[PUT /api/admin/users/[id]/role]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Failed to update user role" },
      { status: 500 },
    );
  }
}
