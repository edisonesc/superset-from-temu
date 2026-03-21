import type { Row } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AggregationFn = "SUM" | "COUNT" | "AVG" | "MIN" | "MAX";

export interface AggregateOptions {
  /** Field to group by (the dimension / label column). */
  labelField: string;
  /** Field to aggregate (the metric / value column). */
  valueField: string;
  /** Aggregation function applied to grouped values. Default: "SUM". */
  aggregation?: AggregationFn;
  /**
   * Normalize labels before grouping: trim whitespace and apply
   * case-insensitive matching so "Apple" and "apple" merge into one slice.
   * Default: false.
   */
  normalizeLabels?: boolean;
  /**
   * Explicit label mappings applied before grouping, e.g.:
   *   { "USA": "United States", "US": "United States" }
   * Checked with both exact-match and case-insensitive key lookup.
   */
  labelMapping?: Record<string, string>;
  /**
   * If set to a positive integer, keep only the top-N slices (by aggregated
   * value, descending) and combine the remainder into a single "Others" slice.
   * 0 or undefined = disabled.
   */
  topN?: number;
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/** Applies an aggregation function to an array of numeric values. */
export function applyAggregation(values: number[], fn: AggregationFn = "SUM"): number {
  if (!values.length) return 0;
  switch (fn) {
    case "COUNT": return values.length;
    case "AVG":   return values.reduce((a, b) => a + b, 0) / values.length;
    case "MIN":   return Math.min(...values);
    case "MAX":   return Math.max(...values);
    default:      return values.reduce((a, b) => a + b, 0); // SUM
  }
}

/** Returns the normalised form of a label (trim + lowercase). */
function normalizeKey(label: string): string {
  return label.trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Groups rows by a label field and aggregates the value field using the
 * specified function. Supports:
 *   - Label normalization (case-insensitive merging)
 *   - Explicit label mapping (e.g. "USA" → "United States")
 *   - Top-N + "Others" bucketing
 *
 * The returned rows each have exactly two keys: `labelField` and `valueField`.
 * This function is intentionally chart-agnostic and can be reused by bar,
 * line, table, and any other chart type.
 *
 * @param rows    Raw data rows from the query layer.
 * @param options Aggregation configuration.
 * @returns       One row per unique (optionally normalised) label.
 */
export function aggregateByLabel(rows: Row[], options: AggregateOptions): Row[] {
  const {
    labelField,
    valueField,
    aggregation = "SUM",
    normalizeLabels = false,
    labelMapping = {},
    topN,
  } = options;

  // Map: groupKey → { displayLabel, collected numeric values }
  const groups = new Map<string, { displayLabel: string; values: number[] }>();

  for (const row of rows) {
    const rawLabel = String(row[labelField] ?? "");

    // 1. Apply explicit label mapping (exact key first, then case-insensitive)
    const mappedLabel =
      labelMapping[rawLabel] ??
      labelMapping[normalizeKey(rawLabel)] ??
      rawLabel;

    // 2. Compute the grouping key
    const groupKey = normalizeLabels ? normalizeKey(mappedLabel) : mappedLabel;

    // 3. Parse numeric value
    const rawVal = row[valueField];
    const numVal =
      typeof rawVal === "number"
        ? rawVal
        : parseFloat(String(rawVal ?? 0));

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        // Use trimmed form as the display label when normalizing
        displayLabel: normalizeLabels ? mappedLabel.trim() : mappedLabel,
        values: [],
      });
    }
    groups.get(groupKey)!.values.push(isNaN(numVal) ? 0 : numVal);
  }

  // Build result array
  let result: Row[] = Array.from(groups.values()).map(({ displayLabel, values }) => ({
    [labelField]: displayLabel,
    [valueField]: applyAggregation(values, aggregation),
  }));

  // Top-N + "Others" grouping
  if (topN && topN > 0 && result.length > topN) {
    result.sort((a, b) => (b[valueField] as number) - (a[valueField] as number));
    const topSlices = result.slice(0, topN);
    const otherSlices = result.slice(topN);
    const othersValue = otherSlices.reduce(
      (acc, r) => acc + (r[valueField] as number),
      0,
    );
    topSlices.push({ [labelField]: "Others", [valueField]: othersValue });
    result = topSlices;
  }

  return result;
}
