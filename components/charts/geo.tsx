"use client";

/**
 * Geo Chart component.
 *
 * This file is the integration point between the existing chart system and the
 * geo chart subsystem.  It follows the exact same contract as every other
 * chart component (configSchema / defaultConfig / transformer exports + default
 * React component export) so it slots seamlessly into ChartBuilder and
 * ChartPanel without any special-casing.
 *
 * Rendering pipeline:
 *   Raw Row[] + ChartConfig
 *     → GeoChartEngine.normalize()   (data layer — no UI deps)
 *     → EChartsGeoAdapter.buildOption()  (adapter layer — ECharts only)
 *     → ReactECharts                  (rendering)
 *
 * To switch map engines: replace the EChartsGeoAdapter import and the
 * ReactECharts render; no other code changes are required.
 */

import { useEffect, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts/core";
import {
  MapChart,
  ScatterChart,
  HeatmapChart,
  EffectScatterChart,
} from "echarts/charts";
import {
  GeoComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

import { GeoChartEngine } from "@/lib/geo/core/GeoChartEngine";
import {
  EChartsGeoAdapter,
  MAP_REGISTRY_NAME,
} from "@/lib/geo/adapters/echarts/EChartsGeoAdapter";
import { useEchartsTheme } from "@/lib/theme";
import type {
  ChartComponentProps,
  ChartConfig,
  ChartConfigSchema,
  Row,
} from "@/types";

// Register only the ECharts components we need (tree-shaking friendly)
echarts.use([
  MapChart,
  ScatterChart,
  HeatmapChart,
  EffectScatterChart,
  GeoComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

// ---------------------------------------------------------------------------
// Chart system exports (required by registry + ChartBuilder)
// ---------------------------------------------------------------------------

export const configSchema: ChartConfigSchema = {
  fields: [
    {
      name: "geo_mode",
      label: "Map Mode",
      type: "select",
      choices: ["scatter", "heatmap", "choropleth"],
      defaultValue: "scatter",
      required: true,
    },
    {
      name: "latitude",
      label: "Latitude Field",
      type: "dimension",
    },
    {
      name: "longitude",
      label: "Longitude Field",
      type: "dimension",
    },
    {
      name: "geo_region",
      label: "Region Field (Choropleth)",
      type: "dimension",
    },
    {
      name: "metric",
      label: "Metric",
      type: "metric",
      required: true,
    },
    {
      name: "color_dimension",
      label: "Color Dimension (Scatter)",
      type: "dimension",
    },
    {
      name: "geo_cluster",
      label: "Cluster Points",
      type: "boolean",
      defaultValue: false,
    },
  ],
};

export const defaultConfig: Partial<ChartConfig> = {
  geo_mode: "scatter",
  geo_cluster: false,
};

/** Passthrough transformer — all transformation is handled inside the component. */
export function transformer(
  rows: Row[],
  config: ChartConfig,
): ChartComponentProps {
  return { data: rows, config };
}

// ---------------------------------------------------------------------------
// World GeoJSON loader (module-level cache so it only fetches once)
// ---------------------------------------------------------------------------

let worldMapPromise: Promise<void> | null = null;

function ensureWorldMap(): Promise<void> {
  if (worldMapPromise) return worldMapPromise;
  worldMapPromise = (async () => {
    if (echarts.getMap(MAP_REGISTRY_NAME)) return;
    const res = await fetch(
      "https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/json/world.json",
    );
    if (!res.ok) throw new Error(`Failed to fetch world map: ${res.status}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geoJson = (await res.json()) as any;
    echarts.registerMap(MAP_REGISTRY_NAME, geoJson);
  })();
  return worldMapPromise;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Geo Chart backed by Apache ECharts.
 * Supports scatter (point map), heatmap, and choropleth modes.
 */
export default function GeoChart({
  data,
  config,
  onCrossFilter,
}: ChartComponentProps) {
  const tokens = useEchartsTheme();
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    ensureWorldMap()
      .then(() => {
        if (isMounted.current) setMapReady(true);
      })
      .catch((err: unknown) => {
        if (isMounted.current) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          setMapError(msg);
        }
      });
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (!data?.length) {
    return (
      <div
        className="flex h-full items-center justify-center text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        No data available
      </div>
    );
  }

  if (mapError) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-1 text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        <span>Failed to load world map</span>
        <span className="text-xs opacity-60">{mapError}</span>
      </div>
    );
  }

  if (!mapReady) {
    return (
      <div
        className="flex h-full items-center justify-center text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        Loading map…
      </div>
    );
  }

  // ── Data pipeline ──────────────────────────────────────────────────────────
  const normalized = GeoChartEngine.normalize(data, config);
  const option = EChartsGeoAdapter.buildOption(normalized, tokens);

  // ── Cross-filter wiring ────────────────────────────────────────────────────
  //  Scatter: filter by color_dimension value when a point is clicked
  //  Choropleth: filter by geo_region value when a region is clicked
  //  Heatmap: no meaningful discrete value to filter on
  type EChartsClickParams = { name?: string; seriesName?: string };
  let onEvents:
    | Record<string, (params: EChartsClickParams) => void>
    | undefined;

  if (onCrossFilter) {
    if (normalized.mode === "choropleth" && config.geo_region) {
      const regionField = config.geo_region;
      onEvents = {
        click: (params) => {
          if (params.name) onCrossFilter(regionField, params.name);
        },
      };
    } else if (normalized.mode === "scatter" && config.color_dimension) {
      const colorField = config.color_dimension;
      onEvents = {
        click: (params) => {
          if (params.seriesName) onCrossFilter(colorField, params.seriesName);
        },
      };
    }
  }

  return (
    <ReactECharts
      echarts={echarts}
      option={option}
      style={{ height: "100%", width: "100%" }}
      onEvents={onEvents}
      notMerge
    />
  );
}
