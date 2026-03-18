"use client";

import ReactECharts from "echarts-for-react";
import type { ChartComponentProps, ChartConfig, ChartConfigSchema, Row } from "@/types";

const COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6", "#14b8a6", "#fb923c"];
const TEXT_COLOR = "#a1a1aa";
const SPLIT_LINE_COLOR = "#27272a";
const AXIS_LINE_COLOR = "#52525b";

export const configSchema: ChartConfigSchema = {
  fields: [
    { name: "x_axis", label: "X Axis (dimension)", type: "dimension", required: true },
    { name: "metrics", label: "Metrics", type: "metrics", required: true },
    { name: "stacked", label: "Stacked", type: "boolean", defaultValue: false },
    { name: "showLegend", label: "Show Legend", type: "boolean", defaultValue: true },
  ],
};

export const defaultConfig: Partial<ChartConfig> = {
  stacked: false,
  showLegend: true,
};

/** Transforms raw rows into AreaChart props. */
export function transformer(rows: Row[], config: ChartConfig): ChartComponentProps {
  return { data: rows, config };
}

/**
 * Stacked area chart backed by Apache ECharts.
 * Supports multiple metrics and optional stacking.
 */
export default function AreaChart({ data, config, onCrossFilter }: ChartComponentProps) {
  if (!data?.length) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
        No data available
      </div>
    );
  }

  const xField = config.x_axis ?? Object.keys(data[0])[0];
  const metricFields =
    config.metrics?.length
      ? config.metrics
      : Object.keys(data[0]).filter((k) => k !== xField);

  const categories = data.map((r) => String(r[xField] ?? ""));

  const series = metricFields.map((m, i) => ({
    name: m,
    type: "line" as const,
    smooth: true,
    stack: config.stacked ? "total" : undefined,
    data: data.map((r) => {
      const val = r[m] ?? r[`__metric_${i}__`];
      return typeof val === "number" ? val : parseFloat(String(val ?? 0));
    }),
    areaStyle: { opacity: config.stacked ? 0.8 : 0.2 },
  }));

  const option = {
    backgroundColor: "transparent",
    color: COLORS,
    tooltip: {
      trigger: "axis",
      backgroundColor: "#18181b",
      borderColor: "#3f3f46",
      textStyle: { color: "#e4e4e7" },
    },
    legend: config.showLegend !== false
      ? { textStyle: { color: TEXT_COLOR }, top: 0 }
      : undefined,
    grid: { left: "3%", right: "4%", bottom: "3%", top: config.showLegend !== false ? 36 : 16, containLabel: true },
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: { color: TEXT_COLOR },
      axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
      boundaryGap: false,
    },
    yAxis: {
      type: "value",
      axisLabel: { color: TEXT_COLOR },
      splitLine: { lineStyle: { color: SPLIT_LINE_COLOR } },
      axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
    },
    series,
  };

  const onEvents = onCrossFilter
    ? {
        click: (params: { name: string }) => {
          onCrossFilter(xField, params.name);
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
