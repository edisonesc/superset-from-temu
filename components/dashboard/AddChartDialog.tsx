"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChartItem = {
  id: string;
  name: string;
  vizType: string;
};

type AddChartDialogProps = {
  onSelect: (chartId: string) => void;
  onClose: () => void;
};

// ---------------------------------------------------------------------------
// AddChartDialog
// ---------------------------------------------------------------------------

/**
 * Modal dialog for picking a chart to add to the dashboard.
 * Fetches available charts from /api/charts and allows search.
 */
export function AddChartDialog({ onSelect, onClose }: AddChartDialogProps) {
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["charts-picker"],
    queryFn: async () => {
      const res = await fetch("/api/charts?pageSize=100");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      // GET /api/charts returns ApiResponse<PaginatedResponse<Chart>>
      // so json.data is { data: ChartItem[], total, page, pageSize }
      return (json.data?.data ?? []) as ChartItem[];
    },
  });

  const filtered = (data ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[70vh] w-full max-w-lg flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">Add Chart</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
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
        </div>

        {/* Search */}
        <div className="border-b border-zinc-800 px-4 py-2">
          <input
            type="text"
            placeholder="Search charts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="w-full rounded bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Chart list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center p-8 text-sm text-zinc-500">
              Loading charts…
            </div>
          )}
          {error && (
            <div className="p-4 text-sm text-red-400">
              Failed to load charts
            </div>
          )}
          {!isLoading && !error && filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-zinc-500">
              No charts found
            </div>
          )}
          {filtered.map((chart) => (
            <button
              key={chart.id}
              onClick={() => {
                onSelect(chart.id);
                onClose();
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-zinc-800"
            >
              <span className="flex-1 font-medium text-zinc-100">
                {chart.name}
              </span>
              <span className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                {chart.vizType}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
