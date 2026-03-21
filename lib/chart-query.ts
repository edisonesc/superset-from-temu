import { db } from "@/db";
import { charts, datasets, databaseConnections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cache } from "@/lib/redis";
import { runQuery } from "@/lib/query-runner";
import { QUERY_CACHE_TTL_SECONDS } from "@/lib/constants";
import { createHash } from "crypto";
import type { ChartComponentProps, ChartConfig, FilterContext, FilterItem, Row, SavedMetric } from "@/types";
import type { Chart, Dataset } from "@/db/schema";
import type { FilterValue } from "@/stores/filterStore";

// ---------------------------------------------------------------------------
// Native filter types
// ---------------------------------------------------------------------------

/**
 * A resolved filter entry ready to be injected into a SQL WHERE clause.
 * Column name is validated and the value is typed.
 */
export type NativeFilterInput = {
  column: string;
  value: FilterValue;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Dialect = "mysql" | "postgresql";

/** Quotes a SQL identifier using the correct syntax for the given dialect. */
function quoteIdentifier(name: string, dialect: Dialect): string {
  if (dialect === "postgresql") return `"${name}"`;
  return `\`${name}\``;
}

/**
 * Wraps the base SQL in a subquery and applies ad-hoc FilterItem WHERE conditions.
 * Used for both chart-level filters (config.filters) and dataset default filters.
 */
function applyAdHocFilters(baseSql: string, filters: FilterItem[], dialect: Dialect): string {
  const conditions: string[] = [];

  for (const { column, operator, value } of filters) {
    const safeCol = column.replace(/[^a-zA-Z0-9_.]/g, "");
    if (!safeCol) continue;
    const quotedCol = quoteIdentifier(safeCol, dialect);
    const escapeVal = (v: unknown) => String(v).replace(/'/g, "''");

    if (operator === "in" || operator === "not in") {
      const vals = Array.isArray(value)
        ? value.map((v) => `'${escapeVal(v)}'`).join(", ")
        : `'${escapeVal(value)}'`;
      const op = operator === "in" ? "IN" : "NOT IN";
      conditions.push(`${quotedCol} ${op} (${vals})`);
    } else if (operator === "like") {
      conditions.push(`${quotedCol} LIKE '%${escapeVal(value)}%'`);
    } else {
      const sqlOp = operator === "==" ? "=" : operator;
      conditions.push(`${quotedCol} ${sqlOp} '${escapeVal(value)}'`);
    }
  }

  if (conditions.length === 0) return baseSql;
  return `SELECT * FROM (${baseSql}) AS __adhoc__ WHERE ${conditions.join(" AND ")}`;
}

/**
 * Returns a dialect-aware SQL expression that truncates/formats a date column to a time grain.
 *  - PostgreSQL: DATE_TRUNC('month', "col")
 *  - MySQL:      DATE_FORMAT(`col`, '%Y-%m')  /  CONCAT(YEAR(`col`), '-Q', QUARTER(`col`))
 */
function getTimeExpression(
  dialect: Dialect,
  col: string,
  grain: NonNullable<ChartConfig["time_grain"]>,
): string {
  const safe = col.replace(/[`"]/g, "");
  const quoted = quoteIdentifier(safe, dialect);
  if (dialect === "postgresql") {
    return `DATE_TRUNC('${grain}', ${quoted})`;
  }
  // MySQL
  if (grain === "quarter") {
    return `CONCAT(YEAR(${quoted}), '-Q', QUARTER(${quoted}))`;
  }
  const fmtMap: Record<string, string> = {
    day: "%Y-%m-%d",
    week: "%Y-%u",
    month: "%Y-%m",
    year: "%Y",
  };
  return `DATE_FORMAT(${quoted}, '${fmtMap[grain]}')`;
}

function buildCacheKey(
  chartId: string,
  filters: FilterContext,
  nativeFilters: NativeFilterInput[],
): string {
  const hash = createHash("sha256")
    .update(chartId + ":" + JSON.stringify(filters) + ":" + JSON.stringify(nativeFilters))
    .digest("hex");
  return `chart:${chartId}:${hash}`;
}

/**
 * Wraps the base SQL in a subquery and applies typed native filter WHERE conditions.
 * Column names are sanitised; values are escaped to prevent injection.
 *
 * Filter types:
 *  - date_range: column >= 'from' AND column <= 'to'
 *  - select:     column IN ('v1', 'v2', ...)
 *  - search:     column LIKE '%query%'
 */
function applyNativeFilters(baseSql: string, filters: NativeFilterInput[], dialect: Dialect): string {
  if (filters.length === 0) return baseSql;

  const conditions: string[] = [];

  for (const { column, value } of filters) {
    const safeCol = column.replace(/[^a-zA-Z0-9_.]/g, "");
    if (!safeCol) continue;
    const quotedCol = quoteIdentifier(safeCol, dialect);

    if (value.type === "date_range") {
      if (value.from) {
        const safe = String(value.from).replace(/'/g, "''");
        conditions.push(`${quotedCol} >= '${safe}'`);
      }
      if (value.to) {
        const safe = String(value.to).replace(/'/g, "''");
        conditions.push(`${quotedCol} <= '${safe}'`);
      }
    } else if (value.type === "select" && value.values.length > 0) {
      const inList = value.values
        .map((v) => `'${String(v).replace(/'/g, "''")}'`)
        .join(", ");
      conditions.push(`${quotedCol} IN (${inList})`);
    } else if (value.type === "search" && value.query.trim()) {
      // Escape LIKE special chars, then wrap in %
      const safe = value.query
        .replace(/'/g, "''")
        .replace(/\\/g, "\\\\")
        .replace(/%/g, "\\%")
        .replace(/_/g, "\\_");
      conditions.push(`${quotedCol} LIKE '%${safe}%'`);
    }
  }

  if (conditions.length === 0) return baseSql;

  const whereClause = conditions.join(" AND ");
  return `SELECT * FROM (${baseSql}) AS __nf_filtered__ WHERE ${whereClause}`;
}

/**
 * Wraps the base SQL in a subquery and applies cross-filter WHERE conditions.
 * Column names are sanitised to [a-zA-Z0-9_] to prevent injection.
 */
function applyFilters(baseSql: string, filters: FilterContext, dialect: Dialect): string {
  const conditions = Object.entries(filters)
    .filter(([, val]) => val !== null && val !== undefined)
    .map(([col, val]) => {
      const safeCol = col.replace(/[^a-zA-Z0-9_.]/g, "");
      if (!safeCol) return null;
      const quotedCol = quoteIdentifier(safeCol, dialect);
      if (Array.isArray(val)) {
        const vals = val
          .map((v) => `'${String(v).replace(/'/g, "''")}'`)
          .join(", ");
        return `${quotedCol} IN (${vals})`;
      }
      const safeVal = String(val).replace(/'/g, "''");
      return `${quotedCol} = '${safeVal}'`;
    })
    .filter(Boolean) as string[];

  if (conditions.length === 0) return baseSql;

  const whereClause = conditions.join(" AND ");
  return `SELECT * FROM (${baseSql}) AS __filtered__ WHERE ${whereClause}`;
}

// ---------------------------------------------------------------------------
// buildChartQuery
// ---------------------------------------------------------------------------

/**
 * Generates a SQL SELECT statement from a chart's config and its backing dataset.
 * Handles both physical tables and virtual (SQL-defined) datasets.
 *
 * @param chart  - The chart record (includes config JSON)
 * @param dataset - The dataset record (includes tableName or sqlDefinition)
 * @returns A SQL string ready to pass to runQuery
 */
export function buildChartQuery(chart: Chart, dataset: Dataset, dialect: Dialect = "mysql"): string {
  const config = chart.config as ChartConfig;

  // Resolve saved metric names → expressions from dataset.metrics
  const savedMetrics = Array.isArray((dataset as Record<string, unknown>).metrics)
    ? ((dataset as Record<string, unknown>).metrics as SavedMetric[])
    : [];
  function resolveMetric(m: string): string {
    const saved = savedMetrics.find((sm) => sm.name === m);
    return saved ? saved.expression : m;
  }

  // Base table or virtual dataset subquery
  const source = dataset.sqlDefinition
    ? `(${dataset.sqlDefinition}) AS __dataset__`
    : quoteIdentifier(dataset.tableName ?? "", dialect);

  const selectParts: string[] = [];
  const groupByParts: string[] = [];

  // --- Time column with grain (prepended as first SELECT / GROUP BY) ---
  if (config.time_column?.trim() && config.time_grain) {
    const timeExpr = getTimeExpression(dialect, config.time_column, config.time_grain);
    // Alias back to the original column name so chart renderers that key on
    // config.x_axis / config.dimension still find the column in result rows.
    const timeAlias = quoteIdentifier(config.time_column.trim(), dialect);
    selectParts.push(`${timeExpr} AS ${timeAlias}`);
    if (!["table", "pivot_table"].includes(chart.vizType)) groupByParts.push(timeExpr);
  }

  // --- Dimension columns (GROUP BY keys) --- (skip empty strings)
  const dims = new Set<string>();
  if (config.x_axis?.trim()) dims.add(config.x_axis);
  if (config.y_axis?.trim()) dims.add(config.y_axis);
  if (config.dimension?.trim()) dims.add(config.dimension);
  if (config.rows) config.rows.filter((r) => r.trim()).forEach((r) => dims.add(r));
  if (config.columns) config.columns.filter((c) => c.trim()).forEach((c) => dims.add(c));
  // Geo chart dimensions (only active when the chart is a geo viz type)
  if (chart.vizType === "geo") {
    if (config.latitude?.trim()) dims.add(config.latitude);
    if (config.longitude?.trim()) dims.add(config.longitude);
    if (config.geo_region?.trim()) dims.add(config.geo_region);
    if (config.color_dimension?.trim()) dims.add(config.color_dimension);
  }

  // When time grain is active, remove the raw time column from dims so the
  // truncated expression (DATE_TRUNC / DATE_FORMAT) is the sole grouping for
  // that column. Without this, both the raw timestamp and the truncated value
  // appear in GROUP BY, neutralising the grain.
  if (config.time_column?.trim() && config.time_grain) {
    dims.delete(config.time_column.trim());
  }

  // Table / pivot_table: no GROUP BY, select all if no dims
  const isAggChart = !["table", "pivot_table"].includes(chart.vizType);

  for (const dim of dims) {
    const quoted = quoteIdentifier(dim.replace(/[`"]/g, ""), dialect);
    selectParts.push(quoted);
    if (isAggChart) groupByParts.push(quoted);
  }

  // --- Metric columns --- (filter out empty strings from unset dropdowns)
  const rawMetrics: string[] = [];
  if (config.metrics?.length) rawMetrics.push(...config.metrics.filter((m) => m.trim()));
  if (config.metric?.trim()) rawMetrics.push(config.metric);
  if (config.comparison_metric?.trim()) rawMetrics.push(config.comparison_metric);
  if (config.bubble_size?.trim()) rawMetrics.push(config.bubble_size);

  const aggregation = config.aggregation;
  let hasAggregation = false;

  rawMetrics.forEach((raw, i) => {
    const m = resolveMetric(raw); // resolve saved metric name → expression
    // If it looks like an aggregation expression (contains a function call), use as-is
    if (/\w+\s*\(/.test(m)) {
      selectParts.push(`${m} AS __metric_${i}__`);
      hasAggregation = true;
    } else if (isAggChart && aggregation) {
      // Apply the configured aggregation function to plain column names
      const quotedCol = quoteIdentifier(m.replace(/[`"]/g, ""), dialect);
      selectParts.push(`${aggregation}(${quotedCol}) AS __metric_${i}__`);
      hasAggregation = true;
    } else {
      selectParts.push(quoteIdentifier(m.replace(/[`"]/g, ""), dialect));
    }
  });

  // Fall back to SELECT * for table charts with no configured columns
  if (selectParts.length === 0) {
    selectParts.push("*");
  }

  let sql = `SELECT ${selectParts.join(", ")}\nFROM ${source}`;

  if (isAggChart && groupByParts.length > 0 && hasAggregation) {
    sql += `\nGROUP BY ${groupByParts.join(", ")}`;
  }

  // ORDER BY / LIMIT (applied before filter wrapping so preview shows correct results)
  if (config.order_by?.trim()) {
    const orderCol = quoteIdentifier(config.order_by.replace(/[`"]/g, ""), dialect);
    const dir = config.sort_order === "DESC" ? "DESC" : "ASC";
    sql += `\nORDER BY ${orderCol} ${dir}`;
  }
  if (config.row_limit && Number(config.row_limit) > 0) {
    sql += `\nLIMIT ${Math.floor(Number(config.row_limit))}`;
  }

  // Chart-level ad-hoc filters (baked into the chart, independent of dashboard filters)
  if (config.filters?.length) {
    sql = applyAdHocFilters(sql, config.filters, dialect);
  }

  // Dataset-level default filters (always applied regardless of chart or dashboard filters)
  const defaultFilters = Array.isArray((dataset as Record<string, unknown>).defaultFilters)
    ? ((dataset as Record<string, unknown>).defaultFilters as FilterItem[])
    : [];
  if (defaultFilters.length > 0) {
    sql = applyAdHocFilters(sql, defaultFilters, dialect);
  }

  return sql;
}

// ---------------------------------------------------------------------------
// fetchChartData
// ---------------------------------------------------------------------------

/**
 * Fetches and returns chart-ready data for a given chart ID.
 * Results are cached in Redis keyed by chartId + filters hash.
 *
 * @param chartId  - ID of the chart record to fetch data for
 * @param userId   - ID of the requesting user (for query history logging)
 * @param filters  - Optional cross-filter context applied as WHERE conditions
 * @returns ChartComponentProps ready to pass directly to the chart component
 */
export async function fetchChartData(
  chartId: string,
  userId: string,
  filters: FilterContext = {},
  nativeFilters: NativeFilterInput[] = [],
): Promise<ChartComponentProps> {
  const cacheKey = buildCacheKey(chartId, filters, nativeFilters);
  const cached = await cache.get<ChartComponentProps>(cacheKey);
  if (cached) return cached;

  // Load chart
  const [chart] = await db
    .select()
    .from(charts)
    .where(eq(charts.id, chartId))
    .limit(1);

  if (!chart) throw new Error("Chart not found");

  // Load dataset
  const [dataset] = await db
    .select()
    .from(datasets)
    .where(eq(datasets.id, chart.datasetId))
    .limit(1);

  if (!dataset) throw new Error("Dataset not found");

  // Load connection to determine SQL dialect for correct identifier quoting
  const [connection] = await db
    .select({ dialect: databaseConnections.dialect })
    .from(databaseConnections)
    .where(eq(databaseConnections.id, dataset.connectionId))
    .limit(1);

  const dialect: Dialect = connection?.dialect === "postgresql" ? "postgresql" : "mysql";

  // Build SQL — apply cross-filters first, then native filters
  const baseSql = buildChartQuery(chart, dataset, dialect);
  let filteredSql = Object.keys(filters).length
    ? applyFilters(baseSql, filters, dialect)
    : baseSql;
  if (nativeFilters.length > 0) {
    filteredSql = applyNativeFilters(filteredSql, nativeFilters, dialect);
  }

  // Execute via runQuery (handles limit enforcement + history logging)
  const result = await runQuery(dataset.connectionId, filteredSql, userId);

  const props: ChartComponentProps = {
    data: result.rows as Row[],
    config: chart.config as ChartConfig,
  };

  await cache.set(cacheKey, props, QUERY_CACHE_TTL_SECONDS);
  return props;
}
