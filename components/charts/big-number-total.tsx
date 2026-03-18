"use client";

import type { ChartComponentProps, ChartConfig, ChartConfigSchema, Row } from "@/types";

export const configSchema: ChartConfigSchema = {
  fields: [
    { name: "metric", label: "Metric", type: "metric", required: true },
    { name: "prefix", label: "Prefix (e.g. $)", type: "string", defaultValue: "" },
    { name: "suffix", label: "Suffix (e.g. %)", type: "string", defaultValue: "" },
  ],
};

export const defaultConfig: Partial<ChartConfig> = {
  prefix: "",
  suffix: "",
};

/** Transforms raw rows into BigNumberTotal props. */
export function transformer(rows: Row[], config: ChartConfig): ChartComponentProps {
  return { data: rows, config };
}

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

/**
 * Big number total — a large KPI display without a trend line.
 * Ideal for summary statistics on dashboards.
 */
export default function BigNumberTotalChart({ data, config }: ChartComponentProps) {
  if (!data?.length) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
        No data available
      </div>
    );
  }

  const metricField = config.metric ?? Object.keys(data[0])[0];
  const rawVal = data[0][metricField] ?? data[0]["__metric_0__"];
  const value = typeof rawVal === "number" ? rawVal : parseFloat(String(rawVal ?? 0));

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <p className="text-xs uppercase tracking-widest text-zinc-500">{metricField}</p>
      <p className="text-6xl font-bold tabular-nums text-zinc-100">
        {config.prefix}
        {formatNumber(value)}
        {config.suffix}
      </p>
    </div>
  );
}
