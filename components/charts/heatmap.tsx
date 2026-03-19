"use client";

import ReactECharts from "echarts-for-react";
import type { ChartComponentProps, ChartConfig, ChartConfigSchema, Row } from "@/types";
import { TEXT_COLOR, AXIS_LINE_COLOR, TOOLTIP_STYLE, HEATMAP_GRADIENT, HEATMAP_TOOLTIP_DIM } from "@/lib/theme";

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
      <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
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
      ...TOOLTIP_STYLE,
      formatter: (params: { value: number[] }) =>
        `<span style="color:${HEATMAP_TOOLTIP_DIM}">${xValues[params.value[0]]} / ${yValues[params.value[1]]}</span><br/><span style="font-weight:600">${params.value[2]}</span>`,
    },
    grid: { left: "3%", right: "4%", bottom: "10%", top: 16, containLabel: true },
    xAxis: {
      type: "category",
      data: xValues,
      splitArea: { show: false },
      axisLabel: { color: TEXT_COLOR, fontSize: 11, rotate: 30 },
      axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "category",
      data: yValues,
      splitArea: { show: false },
      axisLabel: { color: TEXT_COLOR, fontSize: 11 },
      axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
      axisTick: { show: false },
    },
    visualMap: {
      min: minVal,
      max: maxVal,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      textStyle: { color: TEXT_COLOR, fontSize: 11 },
      // Sequential palette: bg-elevated → accent deep → accent → accent-bright → light
      inRange: { color: HEATMAP_GRADIENT },
      outOfRange: { color: ["#F1F5F9"] },
    },
    series: [
      {
        type: "heatmap",
        data: heatData,
        itemStyle: { borderColor: "var(--bg-surface)", borderWidth: 1, borderRadius: 0 },
        label: { show: false },
        emphasis: { itemStyle: { shadowBlur: 0 } },
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
