"use client";

import ReactECharts from "echarts-for-react";
import type { ChartComponentProps, ChartConfig, ChartConfigSchema, Row } from "@/types";
import { CHART_COLORS, useEchartsTheme } from "@/lib/theme";

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
  const { TEXT_COLOR, SPLIT_LINE_COLOR, AXIS_LINE_COLOR, TOOLTIP_STYLE } = useEchartsTheme();

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
    axisLabel: { color: TEXT_COLOR, fontSize: 11, rotate: isHorizontal ? 0 : 30 },
    axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
    axisTick: { show: false },
  };

  const axisValue = {
    type: "value" as const,
    axisLabel: { color: TEXT_COLOR, fontSize: 11 },
    splitLine: { lineStyle: { color: SPLIT_LINE_COLOR } },
    axisLine: { show: false },
    axisTick: { show: false },
  };

  // Apply solid fills with 2px top border-radius (design system spec)
  const seriesWithStyle = series.map((s) => ({
    ...s,
    itemStyle: { borderRadius: isHorizontal ? [0, 2, 2, 0] : [2, 2, 0, 0] },
    emphasis: {
      focus: "series" as const,
      itemStyle: { opacity: 1 },
      // other items fade on hover
    },
    select: { itemStyle: { opacity: 1 } },
    barMaxWidth: 48,
  }));

  const option = {
    backgroundColor: "transparent",
    color: CHART_COLORS,
    tooltip: {
      trigger: "axis",
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
    xAxis: isHorizontal ? axisValue : axisCategory,
    yAxis: isHorizontal ? axisCategory : axisValue,
    series: seriesWithStyle,
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
