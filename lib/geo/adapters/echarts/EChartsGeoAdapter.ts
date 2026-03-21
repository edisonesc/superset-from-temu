/**
 * EChartsGeoAdapter — the sole ECharts-aware module in the geo system.
 *
 * Receives normalised GeoNormalizedData (engine output) and translates it
 * into an ECharts option object.  No ChartConfig or raw Row[] reaches here.
 *
 * Supported modes:
 *  scatter    — geo component + scatter series, colour-grouped by colorGroup
 *  heatmap    — geo component + heatmap series + continuous visualMap
 *  choropleth — map series + continuous visualMap
 *
 * To replace ECharts with another engine (MapLibre, react-map-gl, etc.):
 *  1. Create a sibling adapter directory (e.g. adapters/maplibre/)
 *  2. Implement the same buildOption signature
 *  3. Swap the import in components/charts/geo.tsx
 *  No other file needs to change.
 *
 * Map data:
 *  ECharts v5/v6 ships without built-in map GeoJSON.  The caller is
 *  responsible for fetching and registering the world map before calling
 *  buildOption (see the MAP_REGISTRY_NAME constant).
 */

import type { GeoNormalizedData } from "../../types";
import type { ThemeTokens } from "@/lib/theme";

/** The map name used in echarts.registerMap() and geo/map component. */
export const MAP_REGISTRY_NAME = "world";

// ---------------------------------------------------------------------------
// ECharts option shapes (minimal subset we need — avoids importing echarts
// types on the server which would pull in DOM dependencies)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EChartsOption = Record<string, any>;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildTooltip(tokens: ThemeTokens) {
  return {
    trigger: "item" as const,
    ...tokens.TOOLTIP_STYLE,
  };
}

function buildVisualMap(
  min: number,
  max: number,
  gradient: readonly string[],
  tokens: ThemeTokens,
) {
  return {
    min,
    max,
    calculable: true,
    orient: "horizontal" as const,
    left: "center",
    bottom: 0,
    textStyle: { color: tokens.TEXT_COLOR, fontSize: 11 },
    inRange: { color: [...gradient] },
  };
}

function buildGeoComponent(zoom: number, tokens: ThemeTokens) {
  return {
    map: MAP_REGISTRY_NAME,
    roam: true,
    zoom,
    layoutCenter: ["50%", "50%"],
    layoutSize: "98%",
    label: {
      show: true,
      color: tokens.GEO_LABEL_COLOR,
      fontSize: 10,
      fontWeight: "bold",
    },
    emphasis: {
      itemStyle: { areaColor: tokens.GEO_AREA_HOVER_COLOR },
      label: { show: true, color: tokens.GEO_LABEL_COLOR, fontSize: 10 },
    },
    itemStyle: {
      areaColor: tokens.GEO_AREA_COLOR,
      borderColor: tokens.GEO_BORDER_COLOR,
      borderWidth: 0.5,
    },
    silent: false,
  };
}

// ---------------------------------------------------------------------------
// Mode-specific option builders
// ---------------------------------------------------------------------------

function buildScatterOption(
  geo: GeoNormalizedData,
  tokens: ThemeTokens,
  zoom: number,
): EChartsOption {
  const { points, colorGroups, valueRange } = geo;

  // Group points by colorGroup for individual series (enables legend + colour)
  const seriesMap = new Map<string, [number, number, number][]>();
  for (const pt of points) {
    if (!seriesMap.has(pt.colorGroup)) seriesMap.set(pt.colorGroup, []);
    seriesMap.get(pt.colorGroup)!.push([pt.lng, pt.lat, pt.value]);
  }

  const [minVal, maxVal] = valueRange;
  const range = maxVal - minVal || 1;

  const series = Array.from(seriesMap.entries()).map(([name, data]) => ({
    name,
    type: "effectScatter",
    coordinateSystem: "geo",
    data,
    showEffectOn: "render",
    rippleEffect: {
      period: 4,
      scale: 3,
      brushType: "stroke",
    },
    symbolSize: (val: number[]) => {
      const normalised = (val[2] - minVal) / range;
      return Math.max(5, Math.min(22, 5 + normalised * 17));
    },
    itemStyle: { opacity: 0.9 },
    emphasis: {
      itemStyle: {
        opacity: 1,
        shadowBlur: 10,
        shadowColor: tokens.SCATTER_EMPHASIS_SHADOW,
      },
    },
    tooltip: {
      formatter: (params: { seriesName: string; value: number[] }) =>
        `<span style="font-weight:600">${params.seriesName}</span><br/>` +
        `Lng: ${params.value[0].toFixed(4)}<br/>` +
        `Lat: ${params.value[1].toFixed(4)}<br/>` +
        `${geo.metricField}: ${params.value[2]}`,
    },
  }));

  const showLegend = colorGroups.length > 1 && colorGroups.length <= 12;

  return {
    backgroundColor: tokens.GEO_SEA_COLOR,
    labelLayout: { hideOverlap: false },
    color: tokens.scatterColors,
    tooltip: buildTooltip(tokens),
    legend: showLegend
      ? {
          data: colorGroups,
          textStyle: { color: tokens.TEXT_COLOR, fontSize: 11 },
          top: 0,
          icon: "circle",
          itemWidth: 8,
          itemHeight: 8,
        }
      : undefined,
    geo: buildGeoComponent(zoom, tokens),
    series,
  };
}

function buildHeatmapOption(
  geo: GeoNormalizedData,
  tokens: ThemeTokens,
  zoom: number,
): EChartsOption {
  const { points, valueRange } = geo;
  const [minVal, maxVal] = valueRange;

  const data = points.map((pt) => [pt.lng, pt.lat, pt.value]);

  return {
    backgroundColor: tokens.GEO_SEA_COLOR,
    labelLayout: { hideOverlap: false },
    tooltip: buildTooltip(tokens),
    geo: buildGeoComponent(zoom, tokens),
    visualMap: buildVisualMap(minVal, maxVal, tokens.HEATMAP_GRADIENT, tokens),
    series: [
      {
        type: "heatmap",
        coordinateSystem: "geo",
        data,
        pointSize: 12,
        blurSize: 20,
        tooltip: {
          formatter: (params: { value: number[] }) =>
            `Lng: ${params.value[0].toFixed(4)}<br/>` +
            `Lat: ${params.value[1].toFixed(4)}<br/>` +
            `${geo.metricField}: ${params.value[2]}`,
        },
      },
    ],
  };
}

function buildChoroplethOption(
  geo: GeoNormalizedData,
  tokens: ThemeTokens,
  zoom: number,
): EChartsOption {
  const { regions, valueRange } = geo;
  const [minVal, maxVal] = valueRange;

  const data = regions.map((r) => ({ name: r.name, value: r.value }));

  return {
    backgroundColor: tokens.GEO_SEA_COLOR,
    labelLayout: { hideOverlap: false },
    tooltip: {
      trigger: "item",
      ...tokens.TOOLTIP_STYLE,
      formatter: (params: { name: string; value: number | string }) =>
        `<span style="font-weight:600">${params.name}</span><br/>` +
        `${geo.metricField}: ${typeof params.value === "number" ? params.value : "N/A"}`,
    },
    visualMap: buildVisualMap(minVal, maxVal, tokens.HEATMAP_GRADIENT, tokens),
    series: [
      {
        type: "map",
        map: MAP_REGISTRY_NAME,
        roam: true,
        zoom,
        data,
        label: {
          show: true,
          color: tokens.GEO_LABEL_COLOR,
          fontSize: 10,
          fontWeight: "bold",
        },
        emphasis: {
          label: { show: true, color: tokens.GEO_LABEL_COLOR, fontSize: 10 },
          itemStyle: { areaColor: tokens.GEO_AREA_HOVER_COLOR },
        },
        itemStyle: {
          borderColor: tokens.GEO_BORDER_COLOR,
          borderWidth: 0.3,
        },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const EChartsGeoAdapter = {
  /**
   * Builds a complete ECharts option object from normalised geo data.
   *
   * @param geo    - Normalised data from GeoChartEngine.normalize()
   * @param tokens - Theme token bag from useEchartsTheme()
   * @param zoom   - Initial map zoom level (default 4.5)
   */
  buildOption(
    geo: GeoNormalizedData,
    tokens: ThemeTokens,
    zoom = 4.5,
  ): EChartsOption {
    switch (geo.mode) {
      case "scatter":
        return buildScatterOption(geo, tokens, zoom);
      case "heatmap":
        return buildHeatmapOption(geo, tokens, zoom);
      case "choropleth":
        return buildChoroplethOption(geo, tokens, zoom);
    }
  },
};
