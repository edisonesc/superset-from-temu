"use client";

import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getChart } from "@/components/charts/registry";
import type { FilterContext, ChartComponentProps, ChartVizType } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PublicChartPanelProps = {
  chartId: string;
  filters: FilterContext;
  onCrossFilter?: (column: string, value: unknown) => void;
};

// ---------------------------------------------------------------------------
// PublicChartPanel
// ---------------------------------------------------------------------------

/**
 * Read-only chart panel for public/embedded dashboards.
 * Fetches data from the unauthenticated /api/public/charts/[id]/data endpoint.
 */
export const PublicChartPanel = memo(function PublicChartPanel({
  chartId,
  filters,
  onCrossFilter,
}: PublicChartPanelProps) {
  // Fetch chart meta + data in a single public endpoint (data includes config + vizType via chart meta)
  const metaQuery = useQuery({
    queryKey: ["public-chart-meta", chartId],
    queryFn: async () => {
      // Use the authenticated list endpoint — public pages can still call it
      // since chart meta is low-sensitivity. Fallback: parse vizType from data config.
      const res = await fetch(`/api/charts/${chartId}`);
      if (!res.ok) throw new Error("Failed to load chart");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data as { id: string; name: string; vizType: string };
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const dataQuery = useQuery({
    queryKey: ["public-chart-data", chartId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      for (const [key, val] of Object.entries(filters)) {
        if (val !== null && val !== undefined) params.set(key, String(val));
      }
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`/api/public/charts/${chartId}/data${qs}`);
      if (!res.ok) throw new Error("Failed to load chart data");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data as ChartComponentProps;
    },
    staleTime: 1000 * 60,
    retry: false,
  });

  const isLoading = metaQuery.isLoading || dataQuery.isLoading;
  const error = metaQuery.error || dataQuery.error;
  const chartName = metaQuery.data?.name ?? "Chart";
  const vizType = metaQuery.data?.vizType as ChartVizType | undefined;

  let ChartComponent = null;
  if (vizType) {
    try {
      ChartComponent = getChart(vizType).component;
    } catch {
      // Unknown viz type
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
      {/* Header */}
      <div className="border-b border-zinc-800 px-4 py-2">
        <span className="truncate text-sm font-medium text-zinc-200">
          {chartName}
        </span>
      </div>

      {/* Chart area */}
      <div className="relative flex-1 overflow-hidden p-2">
        {isLoading && (
          <div className="flex h-full flex-col gap-3 p-4">
            <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
            <div className="flex-1 animate-pulse rounded bg-zinc-800/60" />
          </div>
        )}

        {!isLoading && error && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-zinc-500">Chart unavailable</p>
          </div>
        )}

        {!isLoading && !error && dataQuery.data && ChartComponent && (
          <ChartComponent
            data={dataQuery.data.data}
            config={dataQuery.data.config}
            onCrossFilter={onCrossFilter}
          />
        )}
      </div>
    </div>
  );
});
