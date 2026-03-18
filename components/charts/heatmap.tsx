"use client";

import ReactECharts from "echarts-for-react";
import type { ChartComponentProps, ChartConfig, ChartConfigSchema, Row } from "@/types";

const TEXT_COLOR = "#a1a1aa";
const AXIS_LINE_COLOR = "#52525b";

export const configSchema: ChartConfigSchema = {
  fields: [
    { name: "x_axis", label: "X Axis", type: "dimension", required: true },
    { name: "y_axis", label: "Y Axis", type: "dimension", required: true },
    { name: "metric", label: "Metric (value)", type: "metric", required: true },
  ],
};

export const defaultConfig: Partial<ChartConfig> = {};

/** Transforms raw rows into HeatmapChart props. */
export function transformer(rows: Row[], config: ChartConfig): ChartComponentProps {
  return { data: rows, config };
}

/**
 * Heatmap grid chart backed by Apache ECharts.
 * Renders a 2D grid coloured by a metric value.
 */
export default function HeatmapChart({ data, config, onCrossFilter }: ChartComponentProps) {
  if (!data?.length) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
        No data available
      </div>
    );
  }

  const xField = config.x_axis ?? Object.keys(data[0])[0];
  const yField = config.y_axis ?? Object.keys(data[0])[1] ?? xField;
  const metricField = config.metric ?? Object.keys(data[0])[2] ?? xField;

  const xValues = [...new Set(data.map((r) => String(r[xField] ?? "")))];
  const yValues = [...new Set(data.map((r) => String(r[yField] ?? "")))];

  const heatData = data.map((r) => {
    const val = r[metricField] ?? r["__metric_0__"];
    return [
      xValues.indexOf(String(r[xField] ?? "")),
      yValues.indexOf(String(r[yField] ?? "")),
      typeof val === "number" ? val : parseFloat(String(val ?? 0)),
    ];
  });

  const values = heatData.map((d) => d[2] as number);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      position: "top",
      backgroundColor: "#18181b",
      borderColor: "#3f3f46",
      textStyle: { color: "#e4e4e7" },
      formatter: (params: { value: number[] }) =>
        `${xValues[params.value[0]]} / ${yValues[params.value[1]]}: ${params.value[2]}`,
    },
    grid: { left: "3%", right: "4%", bottom: "3%", top: 16, containLabel: true },
    xAxis: {
      type: "category",
      data: xValues,
      splitArea: { show: true },
      axisLabel: { color: TEXT_COLOR, rotate: 30 },
      axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
    },
    yAxis: {
      type: "category",
      data: yValues,
      splitArea: { show: true },
      axisLabel: { color: TEXT_COLOR },
      axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
    },
    visualMap: {
      min: minVal,
      max: maxVal,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      textStyle: { color: TEXT_COLOR },
      inRange: { color: ["#1e1b4b", "#4338ca", "#6366f1", "#a5b4fc", "#e0e7ff"] },
    },
    series: [
      {
        type: "heatmap",
        data: heatData,
        label: { show: false },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.5)" } },
      },
    ],
  };

  const onEvents = onCrossFilter
    ? {
        click: (params: { value: number[] }) => {
          onCrossFilter(xField, xValues[params.value[0]]);
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
