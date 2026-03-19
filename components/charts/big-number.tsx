"use client";

import type { ChartComponentProps, ChartConfig, ChartConfigSchema, Row } from "@/types";

export const configSchema: ChartConfigSchema = {
  fields: [
    { name: "metric", label: "Metric", type: "metric", required: true },
    { name: "comparison_metric", label: "Comparison Metric (trend)", type: "metric" },
    { name: "prefix", label: "Prefix (e.g. $)", type: "string", defaultValue: "" },
    { name: "suffix", label: "Suffix (e.g. %)", type: "string", defaultValue: "" },
  ],
};

export const defaultConfig: Partial<ChartConfig> = {
  prefix: "",
  suffix: "",
};

/** Transforms raw rows into BigNumber props. */
export function transformer(rows: Row[], config: ChartConfig): ChartComponentProps {
  return { data: rows, config };
}

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

/**
 * Big number KPI card with an optional trend indicator.
 * Shows the primary metric prominently and a percentage change if a comparison metric is provided.
 */
export default function BigNumberChart({ data, config }: ChartComponentProps) {
  if (!data?.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
        No data available
      </div>
    );
  }

  const metricField = config.metric ?? Object.keys(data[0])[0];
  const compField = config.comparison_metric;

  const rawVal = data[0][metricField] ?? data[0]["__metric_0__"];
  const value = typeof rawVal === "number" ? rawVal : parseFloat(String(rawVal ?? 0));

  let trend: number | null = null;
  if (compField) {
    const rawComp = data[0][compField] ?? data[0]["__metric_1__"];
    const comp = typeof rawComp === "number" ? rawComp : parseFloat(String(rawComp ?? 0));
    if (comp !== 0) trend = ((value - comp) / Math.abs(comp)) * 100;
  }

  const isPositive = trend !== null && trend >= 0;

  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-2 rounded-lg kpi-bg"
      style={{ padding: "16px" }}
    >
      <p
        className="text-xs uppercase tracking-widest"
        style={{ color: "var(--text-muted)", letterSpacing: "0.1em" }}
      >
        {metricField}
      </p>
      <p
        className="tabular-nums font-bold"
        style={{ fontSize: "clamp(2rem,5vw,3rem)", color: "var(--text-primary)", lineHeight: 1.1 }}
      >
        {config.prefix}
        {formatNumber(value)}
        {config.suffix}
      </p>
      {trend !== null && (
        <div
          className="flex items-center gap-1 text-sm font-medium"
          style={{ color: isPositive ? "var(--success)" : "var(--error)" }}
        >
          <span>{isPositive ? "▲" : "▼"}</span>
          <span>{Math.abs(trend).toFixed(1)}% vs previous</span>
        </div>
      )}
    </div>
  );
}
