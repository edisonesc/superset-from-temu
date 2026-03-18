import { db } from "@/db";
import { charts, datasets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cache } from "@/lib/redis";
import { runQuery } from "@/lib/query-runner";
import { QUERY_CACHE_TTL_SECONDS } from "@/lib/constants";
import { createHash } from "crypto";
import type { ChartComponentProps, ChartConfig, FilterContext, Row } from "@/types";
import type { Chart, Dataset } from "@/db/schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCacheKey(chartId: string, filters: FilterContext): string {
  const hash = createHash("sha256")
    .update(chartId + ":" + JSON.stringify(filters))
    .digest("hex");
  return `chart:${chartId}:${hash}`;
}

/**
 * Wraps the base SQL in a subquery and applies cross-filter WHERE conditions.
 * Column names are sanitised to [a-zA-Z0-9_] to prevent injection.
 */
function applyFilters(baseSql: string, filters: FilterContext): string {
  const conditions = Object.entries(filters)
    .filter(([, val]) => val !== null && val !== undefined)
    .map(([col, val]) => {
      const safeCol = col.replace(/[^a-zA-Z0-9_.]/g, "");
      if (!safeCol) return null;
      if (Array.isArray(val)) {
        const vals = val
          .map((v) => `'${String(v).replace(/'/g, "''")}'`)
          .join(", ");
        return `\`${safeCol}\` IN (${vals})`;
      }
      const safeVal = String(val).replace(/'/g, "''");
      return `\`${safeCol}\` = '${safeVal}'`;
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
export function buildChartQuery(chart: Chart, dataset: Dataset): string {
  const config = chart.config as ChartConfig;

  // Base table or virtual dataset subquery
  const source = dataset.sqlDefinition
    ? `(${dataset.sqlDefinition}) AS __dataset__`
    : `\`${dataset.tableName}\``;

  const selectParts: string[] = [];
  const groupByParts: string[] = [];

  // --- Dimension columns (GROUP BY keys) ---
  const dims = new Set<string>();
  if (config.x_axis) dims.add(config.x_axis);
  if (config.y_axis) dims.add(config.y_axis);
  if (config.dimension) dims.add(config.dimension);
  if (config.rows) config.rows.forEach((r) => dims.add(r));
  if (config.columns) config.columns.forEach((c) => dims.add(c));

  // Table / pivot_table: no GROUP BY, select all if no dims
  const isAggChart = !["table", "pivot_table"].includes(chart.vizType);

  for (const dim of dims) {
    const quoted = `\`${dim.replace(/`/g, "")}\``;
    selectParts.push(quoted);
    if (isAggChart) groupByParts.push(quoted);
  }

  // --- Metric columns ---
  const rawMetrics: string[] = [];
  if (config.metrics?.length) rawMetrics.push(...config.metrics);
  if (config.metric) rawMetrics.push(config.metric);
  if (config.comparison_metric) rawMetrics.push(config.comparison_metric);
  if (config.bubble_size) rawMetrics.push(config.bubble_size);

  rawMetrics.forEach((m, i) => {
    // If it looks like an aggregation expression (contains a function call)
    if (/\w+\s*\(/.test(m)) {
      selectParts.push(`${m} AS __metric_${i}__`);
    } else {
      selectParts.push(`\`${m.replace(/`/g, "")}\``);
    }
  });

  // Fall back to SELECT * for table charts with no configured columns
  if (selectParts.length === 0) {
    selectParts.push("*");
  }

  let sql = `SELECT ${selectParts.join(", ")}\nFROM ${source}`;

  if (isAggChart && groupByParts.length > 0 && rawMetrics.some((m) => /\w+\s*\(/.test(m))) {
    sql += `\nGROUP BY ${groupByParts.join(", ")}`;
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
): Promise<ChartComponentProps> {
  const cacheKey = buildCacheKey(chartId, filters);
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

  // Build SQL
  const baseSql = buildChartQuery(chart, dataset);
  const filteredSql = Object.keys(filters).length
    ? applyFilters(baseSql, filters)
    : baseSql;

  // Execute via runQuery (handles limit enforcement + history logging)
  const result = await runQuery(dataset.connectionId, filteredSql, userId);

  const props: ChartComponentProps = {
    data: result.rows as Row[],
    config: chart.config as ChartConfig,
  };

  await cache.set(cacheKey, props, QUERY_CACHE_TTL_SECONDS);
  return props;
}
