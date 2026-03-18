"use client";

import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getChart } from "@/components/charts/registry";
import type { FilterContext, ChartComponentProps, ChartVizType } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChartPanelProps = {
  chartId: string;
  panelId: string;
  isEditMode: boolean;
  filters: FilterContext;
  onCrossFilter?: (column: string, value: unknown) => void;
  onRemove?: (panelId: string) => void;
};

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchChartData(
  chartId: string,
  filters: FilterContext,
): Promise<ChartComponentProps & { vizType: string }> {
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(filters)) {
    if (val !== null && val !== undefined) {
      params.set(key, String(val));
    }
  }
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/charts/${chartId}/data${qs}`);
  if (!res.ok) throw new Error("Failed to load chart data");
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

async function fetchChartMeta(chartId: string) {
  const res = await fetch(`/api/charts/${chartId}`);
  if (!res.ok) throw new Error("Failed to load chart");
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data as { id: string; name: string; vizType: string };
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function PanelSkeleton() {
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
      <div className="flex-1 animate-pulse rounded bg-zinc-800/60" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChartPanel
// ---------------------------------------------------------------------------

/**
 * Single chart panel within the dashboard canvas.
 * Handles its own data fetching, loading skeleton, and error states.
 * Emits cross-filter events when the user clicks on chart elements.
 */
export const ChartPanel = memo(function ChartPanel({
  chartId,
  panelId,
  isEditMode,
  filters,
  onCrossFilter,
  onRemove,
}: ChartPanelProps) {
  // Fetch chart metadata (name + vizType)
  const metaQuery = useQuery({
    queryKey: ["chart-meta", chartId],
    queryFn: () => fetchChartMeta(chartId),
    staleTime: 1000 * 60 * 5,
  });

  // Fetch chart data — re-fetches when filters change
  const dataQuery = useQuery({
    queryKey: ["chart-data", chartId, filters],
    queryFn: () => fetchChartData(chartId, filters),
    enabled: !!metaQuery.data,
    staleTime: 1000 * 60,
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
      // Unknown viz type — handled below
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <span className="truncate text-sm font-medium text-zinc-200">
          {chartName}
        </span>
        {isEditMode && onRemove && (
          <button
            onClick={() => onRemove(panelId)}
            className="ml-2 flex-shrink-0 rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-red-400"
            title="Remove panel"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Chart area */}
      <div className="relative flex-1 overflow-hidden p-2">
        {isLoading && <PanelSkeleton />}

        {!isLoading && error && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-red-400">
              {error instanceof Error ? error.message : "Failed to load chart"}
            </p>
            <button
              onClick={() => {
                metaQuery.refetch();
                dataQuery.refetch();
              }}
              className="rounded bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !error && dataQuery.data && ChartComponent && (
          <ChartComponent
            data={dataQuery.data.data}
            config={dataQuery.data.config}
            onCrossFilter={onCrossFilter}
          />
        )}

        {!isLoading && !error && !ChartComponent && vizType && (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            Unknown chart type: {vizType}
          </div>
        )}
      </div>
    </div>
  );
});
