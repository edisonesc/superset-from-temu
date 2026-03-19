"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart2, TrendingUp, PieChart, ScatterChart, AreaChart,
  Grid3X3, Hash, Sigma, Table2, LayoutGrid, Plus, Search,
} from "@/components/ui/icons";

const VIZ_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  bar: BarChart2, line: TrendingUp, pie: PieChart, scatter: ScatterChart,
  area: AreaChart, heatmap: Grid3X3, big_number: Hash,
  big_number_total: Sigma, table: Table2, pivot_table: LayoutGrid,
};

type ChartRow = { id: string; name: string; vizType: string; datasetName: string | null; updatedAt: string };

async function fetchCharts(q: string): Promise<{ data: ChartRow[]; total: number }> {
  const res = await fetch(`/api/charts?q=${encodeURIComponent(q)}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

export default function ChartsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["charts", search],
    queryFn: () => fetchCharts(search),
  });
  const charts = data?.data ?? [];

  return (
    <div className="flex h-full flex-col" style={{ background: "var(--bg-base)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}
      >
        <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Charts</h1>
        <Link
          href="/charts/new"
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white transition-colors"
          style={{ background: "var(--accent)", borderRadius: "2px" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "var(--accent-deep)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "var(--accent)")}
        >
          <Plus size={14} />
          New Chart
        </Link>
      </div>

      {/* Search bar */}
      <div
        className="px-6 py-3"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}
      >
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search charts…"
            className="w-full pl-8 pr-3 py-1.5 text-sm outline-none"
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse" style={{ background: "var(--bg-border)", borderRadius: "2px" }} />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm" style={{ color: "var(--error)" }}>Failed to load charts.</p>
        ) : charts.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 py-20 text-center">
            <span style={{ color: "var(--text-muted)" }}><BarChart2 className="h-12 w-12" /></span>
            <div>
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>No charts yet</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                Create your first chart to visualise your data.
              </p>
            </div>
            <Link
              href="/charts/new"
              className="px-4 py-2 text-sm font-medium text-white transition-colors"
              style={{ background: "var(--accent)", borderRadius: "2px" }}
            >
              Create Chart
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {charts.map((chart) => {
              const Icon = VIZ_ICONS[chart.vizType] ?? BarChart2;
              return (
                <Link
                  key={chart.id}
                  href={`/charts/${chart.id}`}
                  className="group flex flex-col gap-3 p-4 transition-colors"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--bg-border)",
                    borderRadius: "2px",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--accent)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--bg-border)")}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2" style={{ background: "rgba(32,167,201,0.08)", borderRadius: "2px", color: "var(--accent)" }}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs capitalize" style={{ color: "var(--text-muted)" }}>
                      {chart.vizType.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium line-clamp-1" style={{ color: "var(--text-primary)" }}>
                      {chart.name}
                    </p>
                    {chart.datasetName && (
                      <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--text-secondary)" }}>
                        {chart.datasetName}
                      </p>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Updated {new Date(chart.updatedAt).toLocaleDateString()}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
