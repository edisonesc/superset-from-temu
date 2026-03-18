"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart2, TrendingUp, PieChart, ScatterChart, AreaChart,
  Grid3X3, Hash, Sigma, Table2, LayoutGrid, Plus, Search,
} from "@/components/ui/icons";

const VIZ_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  bar: BarChart2,
  line: TrendingUp,
  pie: PieChart,
  scatter: ScatterChart,
  area: AreaChart,
  heatmap: Grid3X3,
  big_number: Hash,
  big_number_total: Sigma,
  table: Table2,
  pivot_table: LayoutGrid,
};

type ChartRow = {
  id: string;
  name: string;
  vizType: string;
  datasetName: string | null;
  updatedAt: string;
};

async function fetchCharts(q: string): Promise<{ data: ChartRow[]; total: number }> {
  const res = await fetch(`/api/charts?q=${encodeURIComponent(q)}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

/** Chart list page — grid of chart cards with search. */
export default function ChartsPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["charts", search],
    queryFn: () => fetchCharts(search),
  });

  const charts = data?.data ?? [];

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Charts</h1>
        <Link
          href="/charts/new"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          <Plus size={14} />
          New Chart
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search charts…"
          className="w-full max-w-sm bg-zinc-800 text-zinc-200 text-sm rounded pl-8 pr-3 py-2 outline-none placeholder:text-zinc-600"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-36 rounded-lg bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-red-400 text-sm">Failed to load charts.</div>
      ) : charts.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
          <BarChart2 className="h-12 w-12 text-zinc-700" />
          <div>
            <p className="text-zinc-400 font-medium">No charts yet</p>
            <p className="text-zinc-600 text-sm mt-1">
              Create your first chart to visualise your data.
            </p>
          </div>
          <Link
            href="/charts/new"
            className="px-4 py-2 text-sm rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
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
                className="group flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 hover:bg-zinc-800/60 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="rounded-md bg-zinc-800 p-2 group-hover:bg-zinc-700 transition-colors">
                    <Icon className="h-5 w-5 text-indigo-400" />
                  </div>
                  <span className="text-xs text-zinc-600 capitalize">
                    {chart.vizType.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-200 line-clamp-1">{chart.name}</p>
                  {chart.datasetName && (
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{chart.datasetName}</p>
                  )}
                </div>
                <p className="text-xs text-zinc-700">
                  Updated {new Date(chart.updatedAt).toLocaleDateString()}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
