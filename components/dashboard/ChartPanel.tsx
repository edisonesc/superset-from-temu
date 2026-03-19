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
      <div
        className="h-4 w-32 animate-pulse rounded"
        style={{ background: "var(--bg-elevated)" }}
      />
      <div
        className="flex-1 animate-pulse rounded"
        style={{ background: "var(--bg-border)" }}
      />
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
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--bg-border)",
        borderRadius: "2px",
      }}
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: "1px solid var(--bg-border)" }}
      >
        <span
          className="truncate text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {chartName}
        </span>
        {isEditMode && onRemove && (
          <button
            onClick={() => onRemove(panelId)}
            className="ml-2 shrink-0 rounded p-1 transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--error)";
              (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-elevated)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
              (e.currentTarget as HTMLButtonElement).style.background = "";
            }}
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
            <p className="text-sm" style={{ color: "var(--error)" }}>
              {error instanceof Error ? error.message : "Failed to load chart"}
            </p>
            <button
              onClick={() => {
                metaQuery.refetch();
                dataQuery.refetch();
              }}
              className="rounded px-3 py-1.5 text-xs transition-colors"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-secondary)",
                border: "1px solid var(--bg-border)",
              }}
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
          <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
            Unknown chart type: {vizType}
          </div>
        )}
      </div>
    </div>
  );
});
