"use client";

import type { ChartVizType, ChartConfig, ChartConfigSchema, ChartComponentProps, ChartTransformer } from "@/types";
import type React from "react";

// Chart components
import BarChart, { configSchema as barSchema, defaultConfig as barDefault, transformer as barTransformer } from "./bar";
import LineChart, { configSchema as lineSchema, defaultConfig as lineDefault, transformer as lineTransformer } from "./line";
import PieChart, { configSchema as pieSchema, defaultConfig as pieDefault, transformer as pieTransformer } from "./pie";
import ScatterChart, { configSchema as scatterSchema, defaultConfig as scatterDefault, transformer as scatterTransformer } from "./scatter";
import AreaChart, { configSchema as areaSchema, defaultConfig as areaDefault, transformer as areaTransformer } from "./area";
import HeatmapChart, { configSchema as heatmapSchema, defaultConfig as heatmapDefault, transformer as heatmapTransformer } from "./heatmap";
import BigNumberChart, { configSchema as bigNumSchema, defaultConfig as bigNumDefault, transformer as bigNumTransformer } from "./big-number";
import BigNumberTotalChart, { configSchema as bigNumTotalSchema, defaultConfig as bigNumTotalDefault, transformer as bigNumTotalTransformer } from "./big-number-total";
import TableChart, { configSchema as tableSchema, defaultConfig as tableDefault, transformer as tableTransformer } from "./table-chart";
import PivotTable, { configSchema as pivotSchema, defaultConfig as pivotDefault, transformer as pivotTransformer } from "./pivot-table";
import GeoChart, { configSchema as geoSchema, defaultConfig as geoDefault, transformer as geoTransformer } from "./geo";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The full definition for a chart type registered in the chart registry. */
export type ChartDefinition = {
  vizType: ChartVizType;
  label: string;
  description: string;
  /** Lucide-react icon name for display in the chart type picker. */
  icon: string;
  configSchema: ChartConfigSchema;
  component: React.ComponentType<ChartComponentProps>;
  transformer: ChartTransformer;
  defaultConfig: Partial<ChartConfig>;
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/**
 * Central registry mapping each viz type slug to its full definition.
 * Add new chart types here by registering a ChartDefinition.
 */
export const chartRegistry: Record<ChartVizType, ChartDefinition> = {
  bar: {
    vizType: "bar",
    label: "Bar Chart",
    description: "Compare values across categories with vertical or horizontal bars.",
    icon: "BarChart2",
    configSchema: barSchema,
    component: BarChart,
    transformer: barTransformer,
    defaultConfig: barDefault,
  },
  line: {
    vizType: "line",
    label: "Line Chart",
    description: "Show trends over time or ordered categories.",
    icon: "TrendingUp",
    configSchema: lineSchema,
    component: LineChart,
    transformer: lineTransformer,
    defaultConfig: lineDefault,
  },
  pie: {
    vizType: "pie",
    label: "Pie / Donut Chart",
    description: "Visualise part-to-whole relationships.",
    icon: "PieChart",
    configSchema: pieSchema,
    component: PieChart,
    transformer: pieTransformer,
    defaultConfig: pieDefault,
  },
  scatter: {
    vizType: "scatter",
    label: "Scatter Plot",
    description: "Explore correlations between two numeric dimensions.",
    icon: "ScatterChart",
    configSchema: scatterSchema,
    component: ScatterChart,
    transformer: scatterTransformer,
    defaultConfig: scatterDefault,
  },
  area: {
    vizType: "area",
    label: "Area Chart",
    description: "Stacked or overlapping area bands for cumulative trends.",
    icon: "AreaChart",
    configSchema: areaSchema,
    component: AreaChart,
    transformer: areaTransformer,
    defaultConfig: areaDefault,
  },
  heatmap: {
    vizType: "heatmap",
    label: "Heatmap",
    description: "Colour-coded 2D grid to show metric intensity.",
    icon: "Grid3x3",
    configSchema: heatmapSchema,
    component: HeatmapChart,
    transformer: heatmapTransformer,
    defaultConfig: heatmapDefault,
  },
  big_number: {
    vizType: "big_number",
    label: "Big Number",
    description: "Single KPI with trend comparison.",
    icon: "Hash",
    configSchema: bigNumSchema,
    component: BigNumberChart,
    transformer: bigNumTransformer,
    defaultConfig: bigNumDefault,
  },
  big_number_total: {
    vizType: "big_number_total",
    label: "Big Number Total",
    description: "Single large KPI without trend.",
    icon: "Sigma",
    configSchema: bigNumTotalSchema,
    component: BigNumberTotalChart,
    transformer: bigNumTotalTransformer,
    defaultConfig: bigNumTotalDefault,
  },
  table: {
    vizType: "table",
    label: "Table",
    description: "Sortable, paginated data table.",
    icon: "Table2",
    configSchema: tableSchema,
    component: TableChart,
    transformer: tableTransformer,
    defaultConfig: tableDefault,
  },
  pivot_table: {
    vizType: "pivot_table",
    label: "Pivot Table",
    description: "Cross-tabulation with row and column dimensions.",
    icon: "LayoutGrid",
    configSchema: pivotSchema,
    component: PivotTable,
    transformer: pivotTransformer,
    defaultConfig: pivotDefault,
  },
  geo: {
    vizType: "geo",
    label: "Geo Map",
    description: "Visualise geographic data with scatter, heatmap, or choropleth maps.",
    icon: "Map",
    configSchema: geoSchema,
    component: GeoChart,
    transformer: geoTransformer,
    defaultConfig: geoDefault,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the ChartDefinition for a given viz type.
 * @throws if the viz type is not registered.
 */
export function getChart(vizType: ChartVizType): ChartDefinition {
  const def = chartRegistry[vizType];
  if (!def) throw new Error(`Unknown chart type: ${vizType}`);
  return def;
}

/** Returns all registered chart definitions as an array. */
export function listCharts(): ChartDefinition[] {
  return Object.values(chartRegistry);
}
