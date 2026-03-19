"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { listCharts, getChart } from "./registry";
import type { ChartVizType, ChartConfig, ChartComponentProps } from "@/types";

import {
  BarChart2,
  TrendingUp,
  PieChart,
  ScatterChart,
  AreaChart,
  Grid3X3,
  Hash,
  Sigma,
  Table2,
  LayoutGrid,
  Save,
  RefreshCw,
} from "@/components/ui/icons";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart2, TrendingUp, PieChart, ScatterChart, AreaChart,
  Grid3x3: Grid3X3, Hash, Sigma, Table2, LayoutGrid,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Dataset = {
  id: string;
  name: string;
  connectionId?: string;
  tableName?: string | null;
};

type ColumnInfo = { name: string; type: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json.data as T;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = {
  /** If provided, the builder pre-populates from the existing chart (edit mode). */
  initialChartId?: string;
};

/**
 * Full chart builder UI — dataset selection, dimension/metric picker,
 * chart type selector, live preview, and save.
 */
export default function ChartBuilder({ initialChartId }: Props) {
  const router = useRouter();
  const previewTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── State ────────────────────────────────────────────────────────────────
  const [chartName, setChartName] = useState("Untitled Chart");
  const [vizType, setVizType] = useState<ChartVizType>("bar");
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [config, setConfig] = useState<Partial<ChartConfig>>({});
  const [previewData, setPreviewData] = useState<ChartComponentProps | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [leftTab, setLeftTab] = useState<"data" | "customize">("data");
  const [datasetSearch, setDatasetSearch] = useState("");

  // ── Data Fetching ────────────────────────────────────────────────────────
  const { data: datasetsResp } = useQuery({
    queryKey: ["datasets", datasetSearch],
    queryFn: () =>
      fetchJson<{ data: Dataset[]; total: number }>(`/api/datasets?q=${encodeURIComponent(datasetSearch)}`),
  });
  const datasets = datasetsResp?.data ?? [];

  const { data: columnsResp } = useQuery({
    queryKey: ["dataset-columns", datasetId],
    queryFn: () =>
      fetchJson<ColumnInfo[]>(`/api/datasets/${datasetId}/columns`),
    enabled: !!datasetId,
  });
  const columns = columnsResp ?? [];

  // Load existing chart in edit mode
  const { data: existingChart } = useQuery({
    queryKey: ["chart", initialChartId],
    queryFn: () =>
      fetchJson<{
        id: string;
        name: string;
        vizType: string;
        datasetId: string;
        config: ChartConfig;
      }>(`/api/charts/${initialChartId}`),
    enabled: !!initialChartId,
  });

  useEffect(() => {
    if (existingChart) {
      setChartName(existingChart.name);
      setVizType(existingChart.vizType as ChartVizType);
      setDatasetId(existingChart.datasetId);
      setConfig(existingChart.config ?? {});
    }
  }, [existingChart]);

  // ── Live Preview ─────────────────────────────────────────────────────────
  const triggerPreview = useCallback(
    (ds: string | null, vt: ChartVizType, cfg: Partial<ChartConfig>) => {
      if (!ds) return;
      if (previewTimeout.current) clearTimeout(previewTimeout.current);
      previewTimeout.current = setTimeout(async () => {
        setIsPreviewLoading(true);
        setPreviewError(null);
        try {
          const data = await fetchJson<ChartComponentProps>("/api/charts/preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ datasetId: ds, vizType: vt, config: cfg }),
          });
          setPreviewData(data);
        } catch (err) {
          setPreviewError(err instanceof Error ? err.message : "Preview failed");
          setPreviewData(null);
        } finally {
          setIsPreviewLoading(false);
        }
      }, 500);
    },
    [],
  );

  useEffect(() => {
    triggerPreview(datasetId, vizType, config);
  }, [datasetId, vizType, config, triggerPreview]);

  // ── Save ─────────────────────────────────────────────────────────────────
  const { mutate: saveChart, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      if (!datasetId) throw new Error("Select a dataset first");
      const url = initialChartId ? `/api/charts/${initialChartId}` : "/api/charts";
      const method = initialChartId ? "PUT" : "POST";
      const result = await fetchJson<{ id: string }>(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: chartName, vizType, datasetId, config }),
      });
      return result;
    },
    onSuccess: (result) => {
      toast.success("Chart saved");
      router.push(`/charts/${result?.id ?? initialChartId}`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Save failed"),
  });

  // ── Derived ──────────────────────────────────────────────────────────────
  const chartDef = getChart(vizType);
  const chartSchema = chartDef.configSchema;
  const chartList = listCharts();

  function setConfigField(key: keyof ChartConfig, value: unknown) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  // ── Render ───────────────────────────────────────────────────────────────
  const ChartComponent = chartDef.component;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3 shrink-0">
        <input
          value={chartName}
          onChange={(e) => setChartName(e.target.value)}
          className="flex-1 bg-transparent text-zinc-100 text-sm font-medium outline-none placeholder:text-zinc-600"
          placeholder="Chart name..."
        />
        <button
          onClick={() => saveChart()}
          disabled={isSaving || !datasetId}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors"
        >
          <Save size={14} />
          {isSaving ? "Saving…" : "Save Chart"}
        </button>
      </div>

      {/* Chart type picker */}
      <div className="flex gap-1 overflow-x-auto border-b border-zinc-800 px-4 py-2 shrink-0">
        {chartList.map((def) => {
          const Icon = ICON_MAP[def.icon];
          return (
            <button
              key={def.vizType}
              onClick={() => setVizType(def.vizType)}
              title={def.label}
              className={`flex flex-col items-center gap-1 rounded px-2.5 py-1.5 text-xs transition-colors min-w-max ${
                vizType === def.vizType
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span>{def.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-72 shrink-0 border-r border-zinc-800 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-zinc-800 text-xs">
            {(["data", "customize"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setLeftTab(tab)}
                className={`flex-1 py-2 font-medium capitalize transition-colors ${
                  leftTab === tab
                    ? "border-b-2 border-indigo-500 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {leftTab === "data" ? (
              <>
                {/* Dataset selector */}
                <section>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Dataset</label>
                  <input
                    value={datasetSearch}
                    onChange={(e) => setDatasetSearch(e.target.value)}
                    placeholder="Search datasets…"
                    className="w-full bg-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1.5 outline-none placeholder:text-zinc-600 mb-1.5"
                  />
                  <select
                    value={datasetId ?? ""}
                    onChange={(e) => {
                      setDatasetId(e.target.value || null);
                      setConfig({});
                    }}
                    className="w-full bg-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1.5 outline-none"
                  >
                    <option value="">— select dataset —</option>
                    {datasets.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </section>

                {/* Columns list */}
                {columns.length > 0 && (
                  <section>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                      Available Columns
                    </label>
                    <div className="space-y-1">
                      {columns.map((col) => (
                        <div
                          key={col.name}
                          className="flex items-center justify-between rounded bg-zinc-800/60 px-2 py-1 text-xs"
                        >
                          <span className="text-zinc-300 font-mono">{col.name}</span>
                          <span className="text-zinc-600">{col.type}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Config fields from schema (dimension / metric types) */}
                {chartSchema.fields
                  .filter((f) => ["dimension", "metric", "metrics"].includes(f.type))
                  .map((field) => (
                    <section key={String(field.name)}>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                        {field.label}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      {field.type === "metrics" ? (
                        <div className="space-y-1">
                          {(config.metrics ?? []).map((m, i) => (
                            <div key={i} className="flex gap-1">
                              <select
                                value={m}
                                onChange={(e) => {
                                  const next = [...(config.metrics ?? [])];
                                  next[i] = e.target.value;
                                  setConfigField("metrics", next);
                                }}
                                className="flex-1 bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1 outline-none"
                              >
                                <option value="">— column —</option>
                                {columns.map((c) => (
                                  <option key={c.name} value={c.name}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() =>
                                  setConfigField(
                                    "metrics",
                                    (config.metrics ?? []).filter((_, j) => j !== i),
                                  )
                                }
                                className="px-1.5 text-zinc-600 hover:text-red-400"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() =>
                              setConfigField("metrics", [...(config.metrics ?? []), ""])
                            }
                            className="text-xs text-indigo-400 hover:text-indigo-300"
                          >
                            + Add metric
                          </button>
                        </div>
                      ) : (
                        <select
                          value={String(config[field.name as keyof ChartConfig] ?? "")}
                          onChange={(e) => setConfigField(field.name as keyof ChartConfig, e.target.value)}
                          className="w-full bg-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1.5 outline-none"
                        >
                          <option value="">— column —</option>
                          {columns.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </section>
                  ))}
              </>
            ) : (
              /* Customize tab */
              <>
                {/* Chart-type-specific options */}
                {chartSchema.fields
                  .filter((f) => !["dimension", "metric", "metrics"].includes(f.type))
                  .map((field) => (
                    <section key={String(field.name)}>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                        {field.label}
                      </label>
                      {field.type === "boolean" ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(config[field.name as keyof ChartConfig] ?? field.defaultValue)}
                            onChange={(e) => setConfigField(field.name as keyof ChartConfig, e.target.checked)}
                            className="rounded border-zinc-700 bg-zinc-800 text-indigo-600"
                          />
                          <span className="text-xs text-zinc-300">Enabled</span>
                        </label>
                      ) : field.type === "select" ? (
                        <select
                          value={String(config[field.name as keyof ChartConfig] ?? field.defaultValue ?? "")}
                          onChange={(e) => setConfigField(field.name as keyof ChartConfig, e.target.value)}
                          className="w-full bg-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1.5 outline-none"
                        >
                          {field.choices?.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={String(config[field.name as keyof ChartConfig] ?? field.defaultValue ?? "")}
                          onChange={(e) => setConfigField(field.name as keyof ChartConfig, e.target.value)}
                          className="w-full bg-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1.5 outline-none"
                        />
                      )}
                    </section>
                  ))}

                {/* Common options */}
                <section>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Title</label>
                  <input
                    value={String(config.title ?? "")}
                    onChange={(e) => setConfigField("title", e.target.value)}
                    placeholder="Chart title override…"
                    className="w-full bg-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1.5 outline-none placeholder:text-zinc-600"
                  />
                </section>
                <section>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
                  <textarea
                    value={String(config.description ?? "")}
                    onChange={(e) => setConfigField("description", e.target.value)}
                    rows={2}
                    className="w-full bg-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1.5 outline-none resize-none placeholder:text-zinc-600"
                  />
                </section>
                <section>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showLegend !== false}
                      onChange={(e) => setConfigField("showLegend", e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-800 text-indigo-600"
                    />
                    <span className="text-xs text-zinc-400">Show Legend</span>
                  </label>
                </section>
              </>
            )}
          </div>
        </div>

        {/* Center preview */}
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
          <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2 text-xs text-zinc-500">
            <span>Live Preview</span>
            {isPreviewLoading && (
              <RefreshCw size={12} className="animate-spin text-indigo-400" />
            )}
            {!datasetId && <span className="text-zinc-600">— select a dataset to preview</span>}
          </div>

          <div className="flex-1 p-6">
            {previewError ? (
              <div className="flex h-full items-center justify-center text-red-400 text-sm">
                {previewError}
              </div>
            ) : isPreviewLoading || !previewData ? (
              <div className="flex h-full items-center justify-center">
                {isPreviewLoading ? (
                  <div className="text-zinc-600 text-sm animate-pulse">Loading preview…</div>
                ) : (
                  <div className="text-zinc-700 text-sm">
                    {datasetId ? "Configure the chart to see a preview" : "Select a dataset to get started"}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full">
                <ChartComponent
                  data={previewData.data}
                  config={previewData.config}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
