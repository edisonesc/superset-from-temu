"use client";

import ReactECharts from "echarts-for-react";
import type { ChartComponentProps, ChartConfig, ChartConfigSchema, Row } from "@/types";

const COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6", "#14b8a6", "#fb923c"];
const TEXT_COLOR = "#a1a1aa";
const SPLIT_LINE_COLOR = "#27272a";
const AXIS_LINE_COLOR = "#52525b";

export const configSchema: ChartConfigSchema = {
  fields: [
    { name: "x_axis", label: "X Axis", type: "dimension", required: true },
    { name: "y_axis", label: "Y Axis", type: "metric", required: true },
    { name: "bubble_size", label: "Bubble Size (optional)", type: "metric" },
    { name: "color_dimension", label: "Color Dimension (optional)", type: "dimension" },
    { name: "showLegend", label: "Show Legend", type: "boolean", defaultValue: true },
  ],
};

export const defaultConfig: Partial<ChartConfig> = {
  showLegend: true,
};

/** Transforms raw rows into ScatterChart props. */
export function transformer(rows: Row[], config: ChartConfig): ChartComponentProps {
  return { data: rows, config };
}

/**
 * Scatter (and bubble) chart backed by Apache ECharts.
 * Optional bubble size and color dimension grouping.
 */
export default function ScatterChart({ data, config, onCrossFilter }: ChartComponentProps) {
  if (!data?.length) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
        No data available
      </div>
    );
  }

  const xField = config.x_axis ?? Object.keys(data[0])[0];
  const yField = config.y_axis ?? Object.keys(data[0])[1] ?? xField;
  const sizeField = config.bubble_size;
  const colorField = config.color_dimension;

  // Group by color dimension if specified
  const seriesMap = new Map<string, [number, number, number][]>();

  for (const row of data) {
    const key = colorField ? String(row[colorField] ?? "Other") : "Data";
    const x = parseFloat(String(row[xField] ?? 0));
    const y = parseFloat(String(row[yField] ?? 0));
    const size = sizeField ? parseFloat(String(row[sizeField] ?? 10)) : 10;
    if (!seriesMap.has(key)) seriesMap.set(key, []);
    seriesMap.get(key)!.push([x, y, size]);
  }

  const series = Array.from(seriesMap.entries()).map(([name, pts]) => ({
    name,
    type: "scatter" as const,
    data: pts,
    symbolSize: sizeField ? (v: number[]) => Math.max(5, Math.min(50, v[2] / 10)) : 8,
  }));

  const option = {
    backgroundColor: "transparent",
    color: COLORS,
    tooltip: {
      trigger: "item",
      backgroundColor: "#18181b",
      borderColor: "#3f3f46",
      textStyle: { color: "#e4e4e7" },
      formatter: (params: { seriesName: string; value: number[] }) =>
        `${params.seriesName}<br/>${xField}: ${params.value[0]}<br/>${yField}: ${params.value[1]}`,
    },
    legend: config.showLegend !== false && colorField
      ? { textStyle: { color: TEXT_COLOR }, top: 0 }
      : undefined,
    grid: { left: "3%", right: "4%", bottom: "3%", top: 16, containLabel: true },
    xAxis: {
      type: "value",
      name: xField,
      nameTextStyle: { color: TEXT_COLOR },
      axisLabel: { color: TEXT_COLOR },
      splitLine: { lineStyle: { color: SPLIT_LINE_COLOR } },
      axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
    },
    yAxis: {
      type: "value",
      name: yField,
      nameTextStyle: { color: TEXT_COLOR },
      axisLabel: { color: TEXT_COLOR },
      splitLine: { lineStyle: { color: SPLIT_LINE_COLOR } },
      axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
    },
    series,
  };

  const onEvents = onCrossFilter && colorField
    ? {
        click: (params: { seriesName: string }) => {
          onCrossFilter(colorField, params.seriesName);
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
