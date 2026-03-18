import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createId } from "@paralleldrive/cuid2";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { ApiResponse } from "@/types";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

/**
 * POST /api/auth/register
 * Creates a new user account with the `gamma` role.
 *
 * @body { email: string, password: string, name: string }
 * @returns ApiResponse<{ id: string }>
 */
export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues
        .map((i) => i.message)
        .join(", ");
      return NextResponse.json(
        { data: null, error: message },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;

    const passwordHash = await bcrypt.hash(password, 12);
    const id = createId();

    await db.insert(users).values({
      id,
      email,
      name,
      passwordHash,
      role: "gamma",
    });

    return NextResponse.json({ data: { id }, error: null }, { status: 201 });
  } catch (err) {
    const isDuplicate =
      err instanceof Error && err.message.includes("Duplicate entry");

    if (isDuplicate) {
      return NextResponse.json(
        { data: null, error: "An account with that email already exists." },
        { status: 409 }
      );
    }

    console.error("[register] unexpected error:", err);
    return NextResponse.json(
      { data: null, error: "Internal server error." },
      { status: 500 }
    );
  }
}
