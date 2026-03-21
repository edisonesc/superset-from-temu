/**
 * Geo chart domain types.
 *
 * These interfaces form the contract between the GeoChartEngine (data layer)
 * and any map adapter (rendering layer).  Adapters must only consume
 * GeoNormalizedData — they must never import ChartConfig or raw Row[] directly.
 * This is the seam that allows swapping map engines (ECharts, MapLibre, etc.)
 * without touching chart configuration or the data pipeline.
 */

// ---------------------------------------------------------------------------
// Primitive building blocks
// ---------------------------------------------------------------------------

/** A single geographic point with an associated numeric value. */
export interface GeoPoint {
  /** WGS-84 latitude (-90 … 90). */
  lat: number;
  /** WGS-84 longitude (-180 … 180). */
  lng: number;
  /** Primary metric value for this point (used for sizing/colouring). */
  value: number;
  /** Human-readable label drawn in tooltips. */
  label: string;
  /** Categorical group key; drives colour encoding in scatter mode. */
  colorGroup: string;
}

/** An aggregated region entry used by choropleth mode. */
export interface GeoRegion {
  /** Region name as it appears in the backing GeoJSON (e.g. "France"). */
  name: string;
  /** Aggregated metric value for this region. */
  value: number;
}

// ---------------------------------------------------------------------------
// Engine output
// ---------------------------------------------------------------------------

/** Map rendering modes — each maps to a distinct visual encoding. */
export type GeoMode = "scatter" | "heatmap" | "choropleth";

/**
 * Normalised, adapter-ready representation produced by GeoChartEngine.
 *
 * scatter / heatmap modes consume `points`.
 * choropleth mode consumes `regions`.
 * Both arrays are always present (empty when unused) so adapters can pattern-
 * match on `mode` without optional-chaining.
 */
export interface GeoNormalizedData {
  /** Rendering mode resolved from ChartConfig.geo_mode. */
  mode: GeoMode;

  /** Individual geographic points (scatter + heatmap). */
  points: GeoPoint[];

  /** Region-level aggregations (choropleth). */
  regions: GeoRegion[];

  /** Name of the metric field (used in tooltip headers). */
  metricField: string;

  /** [min, max] of all metric values — used for visualMap range. */
  valueRange: [number, number];

  /** Unique colorGroup keys present in `points` — drives legend + palette. */
  colorGroups: string[];
}
