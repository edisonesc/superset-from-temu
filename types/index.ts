import type { USER_ROLES, SUPPORTED_DIALECTS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Primitives derived from constants
// ---------------------------------------------------------------------------

/** Union of all valid user role strings. */
export type UserRole = (typeof USER_ROLES)[number];

/** Union of supported database dialect strings. */
export type DatabaseDialect = (typeof SUPPORTED_DIALECTS)[number];

/**
 * All supported chart visualisation type slugs.
 * Used as the `viz_type` column in the charts table and as keys in the chart registry.
 */
export type ChartVizType =
  | "bar"
  | "line"
  | "pie"
  | "scatter"
  | "area"
  | "heatmap"
  | "big_number"
  | "big_number_total"
  | "table"
  | "pivot_table";

// ---------------------------------------------------------------------------
// API response envelopes
// ---------------------------------------------------------------------------

/**
 * Standard API response envelope.
 * Every API route must return one of these two shapes.
 *
 * @example
 * // Success
 * return NextResponse.json({ data: user, error: null });
 * // Failure
 * return NextResponse.json({ data: null, error: "Not found" }, { status: 404 });
 */
export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string };

/**
 * Paginated list wrapper returned by list endpoints.
 *
 * @example
 * const resp: PaginatedResponse<User> = {
 *   data: [...],
 *   total: 100,
 *   page: 1,
 *   pageSize: 25,
 * };
 */
export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};
