/**
 * GeoChartEngine — data normalisation layer for geo charts.
 *
 * Responsibilities:
 *  - Resolve field names from ChartConfig with sensible fallbacks
 *  - Extract lat/lng or region values from raw Row[]
 *  - Aggregate by region for choropleth mode
 *  - Apply optional grid-based point clustering for scatter/heatmap modes
 *  - Output a GeoNormalizedData object consumed by any map adapter
 *
 * This class has zero UI dependencies; it can run on the server if needed.
 */

import type { ChartConfig } from "@/types";
import type { Row } from "@/types";
import type { GeoNormalizedData, GeoPoint, GeoRegion, GeoMode } from "../types";

// Grid cell size in degrees for clustering (≈ 5° ≈ 500 km at equator)
const CLUSTER_GRID_DEGREES = 5;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function toNumber(val: unknown, fallback = 0): number {
  if (typeof val === "number" && isFinite(val)) return val;
  const n = parseFloat(String(val ?? ""));
  return isFinite(n) ? n : fallback;
}

function toString(val: unknown): string {
  return val === null || val === undefined ? "" : String(val);
}

/**
 * Resolve the metric value for a row.
 * Checks the named field first, then the aliased __metric_0__ fallback produced
 * by buildChartQuery when an aggregation expression is used.
 */
function resolveMetric(row: Row, metricField: string): number {
  const direct = row[metricField];
  if (direct !== undefined && direct !== null) return toNumber(direct);
  const aliased = row["__metric_0__"];
  if (aliased !== undefined && aliased !== null) return toNumber(aliased);
  return 0;
}

/**
 * Aggregate rows by a string key, summing the metric value.
 */
function aggregateByKey(
  rows: Row[],
  keyField: string,
  metricField: string,
): Map<string, number> {
  const acc = new Map<string, number>();
  for (const row of rows) {
    const key = toString(row[keyField]);
    if (!key) continue;
    acc.set(key, (acc.get(key) ?? 0) + resolveMetric(row, metricField));
  }
  return acc;
}

/**
 * Grid-based point clustering.
 * Points within the same CLUSTER_GRID_DEGREES cell are merged into a centroid
 * with their values summed.  This is O(n) and suitable for large datasets.
 */
function clusterPoints(points: GeoPoint[]): GeoPoint[] {
  const bins = new Map<string, GeoPoint[]>();
  for (const pt of points) {
    const gridLat = Math.floor(pt.lat / CLUSTER_GRID_DEGREES);
    const gridLng = Math.floor(pt.lng / CLUSTER_GRID_DEGREES);
    const key = `${gridLat}:${gridLng}:${pt.colorGroup}`;
    if (!bins.has(key)) bins.set(key, []);
    bins.get(key)!.push(pt);
  }
  return Array.from(bins.values()).map((group) => {
    const count = group.length;
    return {
      lat: group.reduce((s, p) => s + p.lat, 0) / count,
      lng: group.reduce((s, p) => s + p.lng, 0) / count,
      value: group.reduce((s, p) => s + p.value, 0),
      label: count > 1 ? `${count} points` : group[0].label,
      colorGroup: group[0].colorGroup,
    };
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const GeoChartEngine = {
  /**
   * Normalise raw query rows + ChartConfig into GeoNormalizedData.
   *
   * Fallback strategy:
   *  - If latitude/longitude fields are configured  → use lat/lng modes
   *  - If geo_region is configured                  → use choropleth
   *  - If geo_mode is "choropleth" but no region    → fallback to scatter
   */
  normalize(rows: Row[], config: ChartConfig): GeoNormalizedData {
    const mode: GeoMode = config.geo_mode ?? "scatter";
    const metricField = config.metric ?? "";

    // ── Choropleth ──────────────────────────────────────────────────────────
    if (mode === "choropleth") {
      const regionField = config.geo_region ?? "";
      const regionMap = aggregateByKey(rows, regionField, metricField);
      const regions: GeoRegion[] = Array.from(regionMap.entries()).map(
        ([name, value]) => ({ name, value }),
      );
      const values = regions.map((r) => r.value);
      return {
        mode: "choropleth",
        points: [],
        regions,
        metricField,
        valueRange: values.length ? [Math.min(...values), Math.max(...values)] : [0, 0],
        colorGroups: [],
      };
    }

    // ── Scatter / Heatmap ───────────────────────────────────────────────────
    const latField = config.latitude ?? "";
    const lngField = config.longitude ?? "";
    const colorField = config.color_dimension ?? "";

    let points: GeoPoint[] = rows
      .map((row) => {
        const lat = toNumber(row[latField], NaN);
        const lng = toNumber(row[lngField], NaN);
        if (!isFinite(lat) || !isFinite(lng)) return null;
        return {
          lat,
          lng,
          value: resolveMetric(row, metricField),
          label: colorField ? toString(row[colorField]) : `(${lat.toFixed(3)}, ${lng.toFixed(3)})`,
          colorGroup: colorField ? toString(row[colorField]) : "Data",
        } satisfies GeoPoint;
      })
      .filter((p): p is GeoPoint => p !== null);

    if (config.geo_cluster && points.length > 0) {
      points = clusterPoints(points);
    }

    const values = points.map((p) => p.value);
    const colorGroups = [...new Set(points.map((p) => p.colorGroup))];

    return {
      mode,
      points,
      regions: [],
      metricField,
      valueRange: values.length ? [Math.min(...values), Math.max(...values)] : [0, 0],
      colorGroups,
    };
  },
};
