"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

type ChartItem = { id: string; name: string; vizType: string };
type AddChartDialogProps = { onSelect: (chartId: string) => void; onClose: () => void };

/**
 * Modal dialog for picking a chart to add to the dashboard.
 */
export function AddChartDialog({ onSelect, onClose }: AddChartDialogProps) {
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["charts-picker"],
    queryFn: async () => {
      const res = await fetch("/api/charts?pageSize=100");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      return (json.data?.data ?? []) as ChartItem[];
    },
  });

  const filtered = (data ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex max-h-[70vh] w-full max-w-lg flex-col shadow-xl"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: "2px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--bg-border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Add Chart</h2>
          <button
            onClick={onClose}
            className="p-1 transition-colors"
            style={{ color: "var(--text-muted)", borderRadius: "2px" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "")}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2" style={{ borderBottom: "1px solid var(--bg-border)" }}>
          <input
            type="text"
            placeholder="Search charts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="w-full px-3 py-1.5 text-sm outline-none"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--bg-border)",
              color: "var(--text-primary)",
              borderRadius: "2px",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--bg-border)")}
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center p-8 text-sm" style={{ color: "var(--text-muted)" }}>
              Loading charts…
            </div>
          )}
          {error && (
            <div className="p-4 text-sm" style={{ color: "var(--error)" }}>Failed to load charts</div>
          )}
          {!isLoading && !error && filtered.length === 0 && (
            <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>No charts found</div>
          )}
          {filtered.map((chart) => (
            <button
              key={chart.id}
              onClick={() => { onSelect(chart.id); onClose(); }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors"
              style={{ borderBottom: "1px solid var(--bg-border)" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "")}
            >
              <span className="flex-1 font-medium" style={{ color: "var(--text-primary)" }}>{chart.name}</span>
              <span
                className="px-2 py-0.5 text-xs"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--bg-border)",
                  color: "var(--text-secondary)",
                  borderRadius: "2px",
                }}
              >
                {chart.vizType}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
