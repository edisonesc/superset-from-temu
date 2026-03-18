"use client";

import { useMemo } from "react";
import type { ChartComponentProps, ChartConfig, ChartConfigSchema, Row } from "@/types";

export const configSchema: ChartConfigSchema = {
  fields: [
    { name: "rows", label: "Row Dimensions", type: "metrics" },
    { name: "columns", label: "Column Dimensions", type: "metrics" },
    { name: "metrics", label: "Metrics", type: "metrics", required: true },
    {
      name: "aggregation",
      label: "Aggregation",
      type: "select",
      choices: ["SUM", "AVG", "COUNT", "MIN", "MAX"],
      defaultValue: "SUM",
    },
  ],
};

export const defaultConfig: Partial<ChartConfig> = {
  aggregation: "SUM",
};

/** Transforms raw rows into PivotTable props. */
export function transformer(rows: Row[], config: ChartConfig): ChartComponentProps {
  return { data: rows, config };
}

function aggregate(values: number[], method: string): number {
  if (!values.length) return 0;
  switch (method) {
    case "AVG": return values.reduce((a, b) => a + b, 0) / values.length;
    case "COUNT": return values.length;
    case "MIN": return Math.min(...values);
    case "MAX": return Math.max(...values);
    default: return values.reduce((a, b) => a + b, 0); // SUM
  }
}

/**
 * Pivot table — cross-tab aggregation of row and column dimensions against metrics.
 * Aggregation method is configurable (SUM, AVG, COUNT, MIN, MAX).
 */
export default function PivotTable({ data, config }: ChartComponentProps) {
  const { pivotData, rowKeys, colKeys, metricFields } = useMemo(() => {
    if (!data?.length) return { pivotData: new Map(), rowKeys: [], colKeys: [], metricFields: [] };

    const rowDims = config.rows?.length ? config.rows : [Object.keys(data[0])[0]];
    const colDims = config.columns?.length ? config.columns : [];
    const metrics = config.metrics?.length ? config.metrics : [Object.keys(data[0]).slice(-1)[0]];
    const agg = config.aggregation ?? "SUM";

    // Build unique row/col keys
    const rowKeySet = new Set<string>();
    const colKeySet = new Set<string>();

    // pivotData: Map<rowKey, Map<colKey, Map<metric, number[]>>>
    const pivotMap = new Map<string, Map<string, Map<string, number[]>>>();

    for (const row of data) {
      const rk = rowDims.map((d) => String(row[d] ?? "")).join(" | ");
      const ck = colDims.length ? colDims.map((d) => String(row[d] ?? "")).join(" | ") : "__total__";
      rowKeySet.add(rk);
      colKeySet.add(ck);

      if (!pivotMap.has(rk)) pivotMap.set(rk, new Map());
      const colMap = pivotMap.get(rk)!;
      if (!colMap.has(ck)) colMap.set(ck, new Map());
      const metMap = colMap.get(ck)!;

      for (const m of metrics) {
        const val = parseFloat(String(row[m] ?? row["__metric_0__"] ?? 0));
        if (!metMap.has(m)) metMap.set(m, []);
        metMap.get(m)!.push(isNaN(val) ? 0 : val);
      }
    }

    // Aggregate
    const result = new Map<string, Map<string, Map<string, number>>>();
    for (const [rk, colMap] of pivotMap) {
      result.set(rk, new Map());
      for (const [ck, metMap] of colMap) {
        result.get(rk)!.set(ck, new Map());
        for (const [m, vals] of metMap) {
          result.get(rk)!.get(ck)!.set(m, aggregate(vals, agg));
        }
      }
    }

    return {
      pivotData: result,
      rowKeys: [...rowKeySet],
      colKeys: [...colKeySet],
      metricFields: metrics,
    };
  }, [data, config]);

  if (!data?.length) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
        No data available
      </div>
    );
  }

  const showColHeaders = colKeys.length > 1 || colKeys[0] !== "__total__";

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 bg-zinc-900">
          {showColHeaders && (
            <tr>
              <th className="px-3 py-2 border border-zinc-800 text-zinc-500" />
              {colKeys.map((ck) => (
                <th
                  key={ck}
                  colSpan={metricFields.length}
                  className="px-3 py-2 border border-zinc-800 text-center text-zinc-300 font-medium"
                >
                  {ck}
                </th>
              ))}
            </tr>
          )}
          <tr>
            <th className="px-3 py-2 border border-zinc-800 text-left text-zinc-400 font-medium">
              Row
            </th>
            {colKeys.flatMap((ck) =>
              metricFields.map((m) => (
                <th
                  key={`${ck}-${m}`}
                  className="px-3 py-2 border border-zinc-800 text-right text-zinc-400 font-medium whitespace-nowrap"
                >
                  {m}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {rowKeys.map((rk) => (
            <tr key={rk} className="hover:bg-zinc-800/40">
              <td className="px-3 py-1.5 border border-zinc-800 text-zinc-300 font-medium whitespace-nowrap">
                {rk}
              </td>
              {colKeys.flatMap((ck) =>
                metricFields.map((m) => {
                  const val = pivotData.get(rk)?.get(ck)?.get(m);
                  return (
                    <td
                      key={`${ck}-${m}`}
                      className="px-3 py-1.5 border border-zinc-800 text-right text-zinc-300 tabular-nums"
                    >
                      {val !== undefined ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
                    </td>
                  );
                })
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
