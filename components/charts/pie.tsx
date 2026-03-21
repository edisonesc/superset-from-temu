"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { ChartComponentProps, ChartConfig, ChartConfigSchema, Row } from "@/types";
import { useEchartsTheme } from "@/lib/theme";
import { aggregateByLabel } from "@/lib/aggregation";
import type { AggregationFn } from "@/lib/aggregation";

export const configSchema: ChartConfigSchema = {
  fields: [
    { name: "dimension",       label: "Dimension (Group By)", type: "dimension", required: true },
    { name: "metric",          label: "Metric",               type: "metric",    required: true },
    {
      name: "aggregation",
      label: "Aggregation Function",
      type: "select",
      choices: ["SUM", "COUNT", "AVG", "MIN", "MAX"],
      defaultValue: "SUM",
    },
    {
      name: "top_n",
      label: "Top N Slices (0 = all)",
      type: "select",
      choices: ["0", "5", "10", "20", "50"],
      defaultValue: "0",
    },
    { name: "label_normalize", label: "Normalize Labels",     type: "boolean", defaultValue: false },
    { name: "donut",           label: "Donut Style",          type: "boolean", defaultValue: false },
    { name: "show_labels",     label: "Show Labels",          type: "boolean", defaultValue: true },
    { name: "showLegend",      label: "Show Legend",          type: "boolean", defaultValue: true },
  ],
};

export const defaultConfig: Partial<ChartConfig> = {
  aggregation: "SUM",
  top_n: 0,
  label_normalize: false,
  donut: false,
  show_labels: true,
  showLegend: true,
};

/**
 * Transforms raw rows into PieChart props, applying aggregation.
 *
 * Aggregation runs here (in the data layer, not inside the React component)
 * so that the chart component only ever receives one clean row per slice.
 * When dimension or metric are not yet configured the raw rows are passed
 * through unchanged so the preview still renders.
 */
export function transformer(rows: Row[], config: ChartConfig): ChartComponentProps {
  if (!rows.length || !config.dimension || !config.metric) {
    return { data: rows, config };
  }

  const topN = Number(config.top_n) || 0;

  const aggregated = aggregateByLabel(rows, {
    labelField:      config.dimension,
    valueField:      config.metric,
    aggregation:     (config.aggregation ?? "SUM") as AggregationFn,
    normalizeLabels: config.label_normalize ?? false,
    labelMapping:    config.label_mapping ?? {},
    topN:            topN > 0 ? topN : undefined,
  });

  return { data: aggregated, config };
}

/**
 * Pie and donut chart backed by Apache ECharts.
 * Receives pre-aggregated data from the transformer — one row per slice.
 * Supports cross-filter on slice click.
 */
export default function PieChart({ data, config, onCrossFilter }: ChartComponentProps) {
  const { TEXT_COLOR, TOOLTIP_STYLE, PIE_LABEL_COLOR, PIE_LABEL_LINE_COLOR, chartColors } =
    useEchartsTheme();

  const pieData = useMemo(() => {
    if (!data?.length) return [];
    const dimField   = config.dimension ?? Object.keys(data[0])[0];
    const metricField = config.metric   ?? Object.keys(data[0])[1] ?? Object.keys(data[0])[0];

    return data.map((r, i) => {
      const val = r[metricField] ?? r["__metric_0__"];
      return {
        name:      String(r[dimField] ?? ""),
        value:     typeof val === "number" ? val : parseFloat(String(val ?? 0)),
        itemStyle: { color: chartColors[i % chartColors.length] },
      };
    });
  }, [data, config.dimension, config.metric, chartColors]);

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

  const dimField = config.dimension ?? Object.keys(data[0])[0];

  // Donut: 55% inner radius per design spec
  const radius = config.donut ? ["55%", "78%"] : "78%";

  const option = {
    backgroundColor: "transparent",
    color: chartColors,
    tooltip: {
      trigger: "item",
      ...TOOLTIP_STYLE,
      formatter: "{b}: {c} ({d}%)",
    },
    legend:
      config.showLegend !== false
        ? {
            textStyle: { color: TEXT_COLOR, fontSize: 12 },
            orient:    "vertical",
            right:     "5%",
            top:       "center",
            icon:      "circle",
            itemWidth:  8,
            itemHeight: 8,
          }
        : undefined,
    series: [
      {
        type:   "pie",
        radius,
        data:   pieData,
        minAngle: 5,
        // 1px surface-color border between segments for separation
        itemStyle: { borderColor: "var(--bg-surface)", borderWidth: 2 },
        avoidLabelOverlap: true,
        label: {
          show:      config.show_labels !== false,
          color:     PIE_LABEL_COLOR,
          fontSize:  11,
          formatter: "{b}: {d}%",
        },
        labelLine: { lineStyle: { color: PIE_LABEL_LINE_COLOR } },
        emphasis: {
          scale:     true,
          scaleSize: 4,
          itemStyle: { shadowBlur: 0 },
        },
      },
    ],
  };

  const onEvents = onCrossFilter
    ? {
        click: (params: { name: string }) => {
          onCrossFilter(dimField, params.name);
        },
      }
    : undefined;

  return (
    <ReactECharts
      option={option}
      style={{ height: "100%", width: "100%" }}
      onEvents={onEvents}
      notMerge
    />
  );
}
