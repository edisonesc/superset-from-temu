"use client";

import ReactECharts from "echarts-for-react";
import type { ChartComponentProps, ChartConfig, ChartConfigSchema, Row } from "@/types";
import { CHART_COLORS, TEXT_COLOR, TOOLTIP_STYLE, PIE_LABEL_COLOR, PIE_LABEL_LINE_COLOR } from "@/lib/theme";

export const configSchema: ChartConfigSchema = {
  fields: [
    { name: "dimension", label: "Dimension", type: "dimension", required: true },
    { name: "metric", label: "Metric", type: "metric", required: true },
    { name: "donut", label: "Donut Style", type: "boolean", defaultValue: false },
    { name: "show_labels", label: "Show Labels", type: "boolean", defaultValue: true },
    { name: "showLegend", label: "Show Legend", type: "boolean", defaultValue: true },
  ],
};

export const defaultConfig: Partial<ChartConfig> = {
  donut: false,
  show_labels: true,
  showLegend: true,
};

/** Transforms raw rows into PieChart props. */
export function transformer(rows: Row[], config: ChartConfig): ChartComponentProps {
  return { data: rows, config };
}

/**
 * Pie and donut chart backed by Apache ECharts.
 * Supports cross-filter on slice click.
 */
export default function PieChart({ data, config, onCrossFilter }: ChartComponentProps) {
  if (!data?.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
        No data available
      </div>
    );
  }

  const dimField = config.dimension ?? Object.keys(data[0])[0];
  const metricField = config.metric ?? Object.keys(data[0])[1] ?? Object.keys(data[0])[0];

  const pieData = data.map((r) => {
    const val = r[metricField] ?? r["__metric_0__"];
    return {
      name: String(r[dimField] ?? ""),
      value: typeof val === "number" ? val : parseFloat(String(val ?? 0)),
    };
  });

  // Donut: 55% inner radius per design spec
  const radius = config.donut ? ["55%", "78%"] : "78%";

  const option = {
    backgroundColor: "transparent",
    color: CHART_COLORS,
    tooltip: {
      trigger: "item",
      ...TOOLTIP_STYLE,
      formatter: "{b}: {c} ({d}%)",
    },
    legend: config.showLegend !== false
      ? {
          textStyle: { color: TEXT_COLOR, fontSize: 12 },
          orient: "vertical",
          right: "5%",
          top: "center",
          icon: "circle",
          itemWidth: 8,
          itemHeight: 8,
        }
      : undefined,
    series: [
      {
        type: "pie",
        radius,
        data: pieData,
        // 1px surface-color border between segments for separation
        itemStyle: { borderColor: "var(--bg-surface)", borderWidth: 2 },
        label: {
          show: config.show_labels !== false,
          color: PIE_LABEL_COLOR,
          fontSize: 11,
          formatter: "{b}: {d}%",
        },
        labelLine: { lineStyle: { color: PIE_LABEL_LINE_COLOR } },
        emphasis: {
          scale: true,
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
