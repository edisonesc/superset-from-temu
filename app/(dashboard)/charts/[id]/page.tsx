"use client";

import { useState, use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ChartBuilder from "@/components/charts/ChartBuilder";
import { getChart } from "@/components/charts/registry";
import { Edit2, Share2, ArrowLeft, Eye } from "@/components/ui/icons";
import type { ChartComponentProps, ChartVizType } from "@/types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json.data as T;
}

type ChartDetail = {
  id: string;
  name: string;
  vizType: string;
  datasetId: string;
  datasetName: string | null;
  config: Record<string, unknown>;
  updatedAt: string;
};

/**
 * Chart explorer page — view existing chart in read-only or edit mode.
 * Editing requires alpha or admin role.
 */
export default function ChartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [isEditMode, setIsEditMode] = useState(false);

  const canEdit = ["admin", "alpha"].includes(session?.user?.role ?? "");

  const { data: chart, isLoading: chartLoading, isError } = useQuery({
    queryKey: ["chart", id],
    queryFn: () => fetchJson<ChartDetail>(`/api/charts/${id}`),
  });

  const { data: chartData, isLoading: dataLoading } = useQuery({
    queryKey: ["chart-data", id],
    queryFn: () => fetchJson<ChartComponentProps>(`/api/charts/${id}/data`),
    enabled: !!chart && !isEditMode,
  });

  function handleShare() {
    navigator.clipboard.writeText(window.location.href);
    alert("Link copied to clipboard!");
  }

  if (chartLoading) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500 text-sm animate-pulse">
        Loading…
      </div>
    );
  }

  if (isError || !chart) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-red-400">Chart not found or failed to load.</p>
        <Link href="/charts" className="text-sm text-indigo-400 hover:underline">
          ← Back to Charts
        </Link>
      </div>
    );
  }

  if (isEditMode) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-2 text-sm shrink-0">
          <button
            onClick={() => setIsEditMode(false)}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200"
          >
            <Eye size={14} />
            Exit Edit Mode
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChartBuilder initialChartId={id} />
        </div>
      </div>
    );
  }

  // View mode
  let ChartComponent: React.ComponentType<ChartComponentProps> | null = null;
  try {
    ChartComponent = getChart(chart.vizType as ChartVizType).component;
  } catch {
    // Unknown viz type
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3 shrink-0">
        <Link href="/charts" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <h1 className="text-sm font-semibold text-zinc-100">{chart.name}</h1>
          {chart.datasetName && (
            <p className="text-xs text-zinc-500">{chart.datasetName}</p>
          )}
        </div>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded transition-colors"
        >
          <Share2 size={12} />
          Share
        </button>
        {canEdit && (
          <button
            onClick={() => setIsEditMode(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            <Edit2 size={12} />
            Edit
          </button>
        )}
      </div>

      {/* Chart area */}
      <div className="flex-1 p-6 overflow-hidden">
        {dataLoading ? (
          <div className="flex h-full items-center justify-center text-zinc-500 text-sm animate-pulse">
            Loading chart data…
          </div>
        ) : !chartData || !ChartComponent ? (
          <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
            {!ChartComponent ? `Unknown chart type: ${chart.vizType}` : "No data available"}
          </div>
        ) : (
          <ChartComponent data={chartData.data} config={chartData.config} />
        )}
      </div>
    </div>
  );
}
