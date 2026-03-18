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

// ---------------------------------------------------------------------------
// Chart system types (Phase 3)
// ---------------------------------------------------------------------------

/** Raw data row returned from a query execution. */
export type Row = Record<string, unknown>;

/** A filter condition applied to a dimension column. */
export type FilterItem = {
  column: string;
  operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not in" | "like";
  value: unknown;
};

/**
 * Active cross-filter state: maps dimension column name to the filtered value.
 * Used by the dashboard filter bar and chart panels.
 */
export type FilterContext = Record<string, unknown>;

/**
 * Viz-type-specific configuration stored as JSON in the charts table.
 * All fields are optional — each chart type uses a subset.
 */
export interface ChartConfig {
  title?: string;
  description?: string;
  colorScheme?: string;
  showLegend?: boolean;

  x_axis?: string;
  y_axis?: string;
  dimension?: string;

  metric?: string;
  metrics?: string[];

  orientation?: "vertical" | "horizontal";
  show_area?: boolean;
  stacked?: boolean;
  donut?: boolean;
  show_labels?: boolean;
  bubble_size?: string;
  color_dimension?: string;

  comparison_metric?: string;
  suffix?: string;
  prefix?: string;

  rows?: string[];
  columns?: string[];
  aggregation?: "SUM" | "AVG" | "COUNT" | "MIN" | "MAX";

  time_range?: string;
  filters?: FilterItem[];
}

/** Describes a single configurable field exposed in the ChartBuilder form. */
export type ChartConfigField = {
  name: keyof ChartConfig;
  label: string;
  type: "dimension" | "metric" | "metrics" | "boolean" | "string" | "select";
  required?: boolean;
  choices?: string[];
  defaultValue?: unknown;
};

/** Describes what configuration a chart type requires; drives the ChartBuilder UI. */
export type ChartConfigSchema = {
  fields: ChartConfigField[];
};

/**
 * Props passed to every chart component.
 * Components receive raw data rows and the chart config;
 * all viz-specific transformations are handled internally.
 */
export type ChartComponentProps = {
  data: Row[];
  config: ChartConfig;
  onCrossFilter?: (dimension: string, value: unknown) => void;
};

/**
 * Pure function that transforms raw query rows + config into ChartComponentProps.
 * Registered alongside the React component in the chart registry.
 */
export type ChartTransformer = (rows: Row[], config: ChartConfig) => ChartComponentProps;
