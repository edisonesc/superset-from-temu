/**
 * Application-wide constants shared by server and client code.
 * Import from this file to avoid magic strings/numbers scattered across the codebase.
 */

/** All valid user role values. Mirrors the `role` enum in db/schema.ts. */
export const USER_ROLES = ["admin", "alpha", "gamma", "public"] as const;

/** Supported database dialects for connections. Mirrors the `dialect` enum in db/schema.ts. */
export const SUPPORTED_DIALECTS = ["mysql", "postgresql"] as const;

/**
 * How long (in seconds) query results are cached in Redis.
 * 5 minutes — balances freshness vs DB load for exploratory queries.
 */
export const QUERY_CACHE_TTL_SECONDS = 300;

/**
 * Maximum number of rows returned by any user SQL query.
 * If the query lacks a LIMIT clause, one is appended automatically.
 */
export const MAX_QUERY_ROWS = 10_000;

/**
 * Default page size for paginated list endpoints and UI tables.
 */
export const DEFAULT_PAGE_SIZE = 25;
