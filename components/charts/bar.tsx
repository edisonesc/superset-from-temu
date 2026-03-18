"use client";

import ReactECharts from "echarts-for-react";
import type { ChartComponentProps, ChartConfig, ChartConfigSchema, Row } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6", "#14b8a6", "#fb923c"];
const TEXT_COLOR = "#a1a1aa";
const SPLIT_LINE_COLOR = "#27272a";
const AXIS_LINE_COLOR = "#52525b";

// ---------------------------------------------------------------------------
// Config schema
// ---------------------------------------------------------------------------

export const configSchema: ChartConfigSchema = {
  fields: [
    { name: "x_axis", label: "X Axis (dimension)", type: "dimension", required: true },
    { name: "metrics", label: "Metrics", type: "metrics", required: true },
    {
      name: "orientation",
      label: "Orientation",
      type: "select",
      choices: ["vertical", "horizontal"],
      defaultValue: "vertical",
    },
    { name: "showLegend", label: "Show Legend", type: "boolean", defaultValue: true },
  ],
};

export const defaultConfig: Partial<ChartConfig> = {
  orientation: "vertical",
  showLegend: true,
};

// ---------------------------------------------------------------------------
// Transformer
// ---------------------------------------------------------------------------

/**
 * Transforms raw query rows + bar chart config into ChartComponentProps.
 */
export function transformer(rows: Row[], config: ChartConfig): ChartComponentProps {
  return { data: rows, config };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Vertical and horizontal bar chart backed by Apache ECharts.
 * Supports multiple metrics and cross-filter on bar click.
 */
export default function BarChart({ data, config, onCrossFilter }: ChartComponentProps) {
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
  const isHorizontal = config.orientation === "horizontal";

  const series = metricFields.map((m) => ({
    name: m,
    type: "bar" as const,
    data: data.map((r) => {
      // Handle aliased metric columns
      const val = r[m] ?? r[`__metric_${metricFields.indexOf(m)}__`];
      return typeof val === "number" ? val : parseFloat(String(val ?? 0));
    }),
  }));

  const axisCategory = {
    type: "category" as const,
    data: categories,
    axisLabel: { color: TEXT_COLOR, rotate: isHorizontal ? 0 : 30 },
    axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
    axisTick: { lineStyle: { color: AXIS_LINE_COLOR } },
  };

  const axisValue = {
    type: "value" as const,
    axisLabel: { color: TEXT_COLOR },
    splitLine: { lineStyle: { color: SPLIT_LINE_COLOR } },
    axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
  };

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
    xAxis: isHorizontal ? axisValue : axisCategory,
    yAxis: isHorizontal ? axisCategory : axisValue,
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
