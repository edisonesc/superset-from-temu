"use client";

import ReactECharts from "echarts-for-react";
import type { ChartComponentProps, ChartConfig, ChartConfigSchema, Row } from "@/types";
import { useEchartsTheme } from "@/lib/theme";

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
  const { TEXT_COLOR, SPLIT_LINE_COLOR, AXIS_LINE_COLOR, AXIS_POINTER_COLOR, TOOLTIP_STYLE, chartColors } = useEchartsTheme();

  if (!data?.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
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
    lineStyle: { width: 2 },
    symbol: "none",
    stack: config.stacked ? "total" : undefined,
    data: data.map((r) => {
      const val = r[m] ?? r[`__metric_${i}__`];
      return typeof val === "number" ? val : parseFloat(String(val ?? 0));
    }),
    // Per design spec: flat transparent fill — no gradient
    areaStyle: { opacity: config.stacked ? 0.10 : 0.12 },
  }));

  const option = {
    backgroundColor: "transparent",
    color: chartColors,
    tooltip: {
      trigger: "axis",
      axisPointer: { lineStyle: { color: AXIS_POINTER_COLOR, width: 1 } },
      ...TOOLTIP_STYLE,
    },
    legend: config.showLegend !== false
      ? {
          textStyle: { color: TEXT_COLOR, fontSize: 12 },
          top: 0,
          icon: "circle",
          itemWidth: 8,
          itemHeight: 8,
        }
      : undefined,
    grid: { left: "3%", right: "4%", bottom: "3%", top: config.showLegend !== false ? 36 : 16, containLabel: true },
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: { color: TEXT_COLOR, fontSize: 11 },
      axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
      axisTick: { show: false },
      boundaryGap: false,
    },
    yAxis: {
      type: "value",
      axisLabel: { color: TEXT_COLOR, fontSize: 11 },
      splitLine: { lineStyle: { color: SPLIT_LINE_COLOR } },
      axisLine: { show: false },
      axisTick: { show: false },
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
