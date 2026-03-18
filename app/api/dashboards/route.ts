import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { dashboards } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { ApiResponse, PaginatedResponse } from "@/types";
import type { Dashboard } from "@/db/schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

// ---------------------------------------------------------------------------
// GET /api/dashboards
// ---------------------------------------------------------------------------

/**
 * Returns a paginated list of dashboards.
 * Query params: page, pageSize
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.max(
      1,
      parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE)),
    );
    const offset = (page - 1) * pageSize;

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(dashboards)
        .orderBy(desc(dashboards.createdAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(dashboards),
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    return NextResponse.json<PaginatedResponse<Dashboard> & { error: null }>({
      data: rows,
      total,
      page,
      pageSize,
      error: null,
    });
  } catch (err) {
    console.error("[GET /api/dashboards]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/dashboards
// ---------------------------------------------------------------------------

/**
 * Creates a new dashboard. Auto-generates a slug from the name.
 * Requires alpha or admin role.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { role } = session.user;
    if (role !== "admin" && role !== "alpha") {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Forbidden" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: parsed.error.message },
        { status: 400 },
      );
    }

    const { name, description } = parsed.data;

    // Ensure unique slug
    let slug = slugify(name);
    const existing = await db
      .select({ id: dashboards.id })
      .from(dashboards)
      .where(eq(dashboards.slug, slug))
      .limit(1);
    if (existing.length > 0) {
      slug = `${slug}-${createId().slice(0, 6)}`;
    }

    const id = createId();
    await db.insert(dashboards).values({
      id,
      name,
      description: description ?? null,
      slug,
      layout: [],
      filterConfig: [],
      isPublished: false,
      createdBy: session.user.id,
    });

    const [dashboard] = await db
      .select()
      .from(dashboards)
      .where(eq(dashboards.id, id));

    return NextResponse.json<ApiResponse<Dashboard>>(
      { data: dashboard, error: null },
      { status: 201 },
    );
  } catch (err) {
    console.error("[POST /api/dashboards]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Internal server error" },
      { status: 500 },
    );
  }
}
