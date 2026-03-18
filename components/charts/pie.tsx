"use client";

import ReactECharts from "echarts-for-react";
import type { ChartComponentProps, ChartConfig, ChartConfigSchema, Row } from "@/types";

const COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6", "#14b8a6", "#fb923c"];
const TEXT_COLOR = "#a1a1aa";

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
      <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
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

  const radius = config.donut ? ["40%", "70%"] : "70%";

  const option = {
    backgroundColor: "transparent",
    color: COLORS,
    tooltip: {
      trigger: "item",
      backgroundColor: "#18181b",
      borderColor: "#3f3f46",
      textStyle: { color: "#e4e4e7" },
      formatter: "{b}: {c} ({d}%)",
    },
    legend: config.showLegend !== false
      ? { textStyle: { color: TEXT_COLOR }, orient: "vertical", right: "5%", top: "center" }
      : undefined,
    series: [
      {
        type: "pie",
        radius,
        data: pieData,
        label: {
          show: config.show_labels !== false,
          color: TEXT_COLOR,
          formatter: "{b}: {d}%",
        },
        emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0,0,0,0.5)" } },
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
