"use client";

import ReactECharts from "echarts-for-react";
import type { ChartComponentProps, ChartConfig, ChartConfigSchema, Row } from "@/types";
import { useEchartsTheme } from "@/lib/theme";

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
  const { TEXT_COLOR, SPLIT_LINE_COLOR, TOOLTIP_STYLE, SCATTER_EMPHASIS_SHADOW, scatterColors } = useEchartsTheme();

  if (!data?.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
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
    // Points: 6px solid, 0.7 opacity to show density
    symbolSize: sizeField ? (v: number[]) => Math.max(5, Math.min(50, v[2] / 10)) : 6,
    itemStyle: { opacity: 0.7 },
    emphasis: {
      itemStyle: {
        opacity: 1,
        shadowBlur: 4,
        shadowColor: SCATTER_EMPHASIS_SHADOW,
      },
    },
  }));

  const option = {
    backgroundColor: "transparent",
    color: scatterColors,
    tooltip: {
      trigger: "item",
      ...TOOLTIP_STYLE,
      formatter: (params: { seriesName: string; value: number[] }) =>
        `<span style="font-weight:600">${params.seriesName}</span><br/>${xField}: ${params.value[0]}<br/>${yField}: ${params.value[1]}`,
    },
    legend: config.showLegend !== false && colorField
      ? {
          textStyle: { color: TEXT_COLOR, fontSize: 12 },
          top: 0,
          icon: "circle",
          itemWidth: 8,
          itemHeight: 8,
        }
      : undefined,
    grid: { left: "3%", right: "4%", bottom: "3%", top: 16, containLabel: true },
    xAxis: {
      type: "value",
      name: xField,
      nameTextStyle: { color: TEXT_COLOR, fontSize: 11 },
      axisLabel: { color: TEXT_COLOR, fontSize: 11 },
      splitLine: { lineStyle: { color: SPLIT_LINE_COLOR } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      name: yField,
      nameTextStyle: { color: TEXT_COLOR, fontSize: 11 },
      axisLabel: { color: TEXT_COLOR, fontSize: 11 },
      splitLine: { lineStyle: { color: SPLIT_LINE_COLOR } },
      axisLine: { show: false },
      axisTick: { show: false },
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
