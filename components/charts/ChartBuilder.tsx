"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listCharts, getChart } from "./registry";
import type {
  ChartVizType,
  ChartConfig,
  ChartComponentProps,
  FilterItem,
  SavedMetric,
} from "@/types";

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
  Map,
} from "@/components/ui/icons";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart2,
  TrendingUp,
  PieChart,
  ScatterChart,
  AreaChart,
  Grid3x3: Grid3X3,
  Hash,
  Sigma,
  Table2,
  LayoutGrid,
  Map,
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

type ColumnInfo = { name: string; type: string; is_temporal?: boolean };

const FILTER_OPERATORS: FilterItem["operator"][] = [
  "==",
  "!=",
  ">",
  "<",
  ">=",
  "<=",
  "in",
  "not in",
  "like",
];

const TIME_GRAINS: Array<{ value: ChartConfig["time_grain"]; label: string }> =
  [
    { value: undefined, label: "Off" },
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "quarter", label: "Quarter" },
    { value: "year", label: "Year" },
  ];

const AUTO_REFRESH_OPTIONS = [
  { value: 0, label: "Off" },
  { value: 10, label: "10 seconds" },
  { value: 30, label: "30 seconds" },
  { value: 60, label: "1 minute" },
  { value: 300, label: "5 minutes" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json();
  if (!res.ok || json.error)
    throw new Error(json.error ?? `HTTP ${res.status}`);
  return json.data as T;
}

// ---------------------------------------------------------------------------
// SelectBox helper (styled consistently)
// ---------------------------------------------------------------------------

function SelectBox({
  value,
  onChange,
  children,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs px-2.5 py-1.5 outline-none"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--bg-border)",
          color: "var(--text-primary)",
          borderRadius: "2px",
          appearance: "none",
          WebkitAppearance: "none",
          paddingRight: "28px",
          ...style,
        }}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2"
        style={{ display: "block", color: "var(--text-muted)" }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </div>
  );
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
  const queryClient = useQueryClient();
  const previewTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── State ────────────────────────────────────────────────────────────────
  const [chartName, setChartName] = useState("Untitled Chart");
  const [vizType, setVizType] = useState<ChartVizType>("bar");
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [config, setConfig] = useState<Partial<ChartConfig>>({});
  const [previewData, setPreviewData] = useState<ChartComponentProps | null>(
    null,
  );
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [leftTab, setLeftTab] = useState<"data" | "customize" | "filters">(
    "data",
  );
  const [datasetSearch, setDatasetSearch] = useState("");

  // ── Data Fetching ────────────────────────────────────────────────────────
  const { data: datasetsResp } = useQuery({
    queryKey: ["datasets", datasetSearch],
    queryFn: () =>
      fetchJson<{ data: Dataset[]; total: number }>(
        `/api/datasets?q=${encodeURIComponent(datasetSearch)}`,
      ),
  });
  const datasets = datasetsResp?.data ?? [];

  const { data: columnsResp } = useQuery({
    queryKey: ["dataset-columns", datasetId],
    queryFn: () =>
      fetchJson<ColumnInfo[]>(`/api/datasets/${datasetId}/columns`),
    enabled: !!datasetId,
  });
  const columns = columnsResp ?? [];

  // Fetch dataset meta for saved metrics
  const { data: datasetMeta } = useQuery({
    queryKey: ["dataset-meta", datasetId],
    queryFn: () =>
      fetchJson<{ metrics?: unknown }>(`/api/datasets/${datasetId}`),
    enabled: !!datasetId,
  });
  const savedMetrics: SavedMetric[] = Array.isArray(datasetMeta?.metrics)
    ? (datasetMeta.metrics as SavedMetric[])
    : [];

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
          const data = await fetchJson<ChartComponentProps>(
            "/api/charts/preview",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ datasetId: ds, vizType: vt, config: cfg }),
            },
          );
          setPreviewData(data);
        } catch (err) {
          setPreviewError(
            err instanceof Error ? err.message : "Preview failed",
          );
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
      const url = initialChartId
        ? `/api/charts/${initialChartId}`
        : "/api/charts";
      const method = initialChartId ? "PUT" : "POST";
      const result = await fetchJson<{ id: string }>(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: chartName, vizType, datasetId, config }),
      });
      return result;
    },
    onSuccess: (result) => {
      const id = result?.id ?? initialChartId;
      queryClient.invalidateQueries({ queryKey: ["chart-meta", id] });
      queryClient.invalidateQueries({ queryKey: ["chart-data", id] });
      queryClient.invalidateQueries({ queryKey: ["chart", id] });
      toast.success("Chart saved");
      router.push(`/charts/${id}`);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Save failed"),
  });

  // ── Derived ──────────────────────────────────────────────────────────────
  const chartDef = getChart(vizType);
  const chartSchema = chartDef.configSchema;
  const chartList = listCharts();

  function setConfigField(key: keyof ChartConfig, value: unknown) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  // Apply the chart-specific transformer to raw preview data before rendering.
  const transformedPreview = useMemo(() => {
    if (!previewData) return null;
    return chartDef.transformer(previewData.data, previewData.config);
  }, [previewData, chartDef]);

  // ── Filter helpers ────────────────────────────────────────────────────────
  const filters = config.filters ?? [];

  function addFilter() {
    setConfigField("filters", [
      ...filters,
      { column: "", operator: "==" as const, value: "" },
    ]);
  }

  function removeFilter(i: number) {
    setConfigField(
      "filters",
      filters.filter((_, j) => j !== i),
    );
  }

  function updateFilter(i: number, patch: Partial<FilterItem>) {
    const next = filters.map((f, j) => (j === i ? { ...f, ...patch } : f));
    setConfigField("filters", next);
  }

  // ── Metric option builder (combines saved metrics + raw columns) ───────────
  function MetricOptions() {
    return (
      <>
        <option value="">— metric —</option>
        {savedMetrics.length > 0 && (
          <optgroup label="Saved Metrics">
            {savedMetrics.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </optgroup>
        )}
        <optgroup label={savedMetrics.length > 0 ? "Columns" : ""}>
          {columns.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </optgroup>
      </>
    );
  }

  // Temporal columns first, then the rest
  const temporalColumns = columns.filter((c) => c.is_temporal);
  const otherColumns = columns.filter((c) => !c.is_temporal);

  // ── Render ───────────────────────────────────────────────────────────────
  const ChartComponent = chartDef.component;

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--bg-border)",
        }}
      >
        <input
          value={chartName}
          onChange={(e) => setChartName(e.target.value)}
          className="flex-1 text-sm font-medium outline-none"
          style={{ background: "transparent", color: "var(--text-primary)" }}
          placeholder="Chart name..."
        />
        <button
          onClick={() => saveChart()}
          disabled={isSaving || !datasetId}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 transition-colors"
          style={{ background: "var(--accent)", borderRadius: "2px" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              "var(--accent-deep)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              "var(--accent)")
          }
        >
          <Save size={14} />
          {isSaving ? "Saving…" : "Save Chart"}
        </button>
      </div>

      {/* Chart type picker */}
      <div
        className="flex gap-1 overflow-x-auto px-4 py-2 shrink-0"
        style={{
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--bg-border)",
        }}
      >
        {chartList.map((def) => {
          const Icon = ICON_MAP[def.icon];
          const isActive = vizType === def.vizType;
          return (
            <button
              key={def.vizType}
              onClick={() => setVizType(def.vizType)}
              title={def.label}
              className="flex flex-col items-center gap-1 px-2.5 py-1.5 text-xs transition-colors min-w-max"
              style={{
                borderRadius: "2px",
                background: isActive ? "var(--accent)" : "transparent",
                color: isActive ? "#fff" : "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--bg-hover)";
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "transparent";
              }}
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
        <div
          className="w-72 shrink-0 flex flex-col overflow-hidden"
          style={{
            borderRight: "1px solid var(--bg-border)",
            background: "var(--bg-surface)",
          }}
        >
          {/* Tabs */}
          <div
            className="flex text-xs"
            style={{ borderBottom: "1px solid var(--bg-border)" }}
          >
            {(["data", "customize", "filters"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setLeftTab(tab)}
                className="flex-1 py-2 font-medium capitalize transition-colors"
                style={{
                  borderBottom:
                    leftTab === tab
                      ? "2px solid var(--accent)"
                      : "2px solid transparent",
                  color:
                    leftTab === tab
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                }}
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
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Dataset
                  </label>
                  <input
                    value={datasetSearch}
                    onChange={(e) => setDatasetSearch(e.target.value)}
                    placeholder="Search datasets…"
                    className="w-full text-xs px-2.5 py-1.5 outline-none mb-1.5"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--bg-border)",
                      color: "var(--text-primary)",
                      borderRadius: "2px",
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = "var(--accent)")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "var(--bg-border)")
                    }
                  />
                  <SelectBox
                    value={datasetId ?? ""}
                    onChange={(v) => {
                      setDatasetId(v || null);
                      setConfig({});
                    }}
                  >
                    <option value="">— select dataset —</option>
                    {datasets.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </SelectBox>
                </section>

                {/* Columns list */}
                {columns.length > 0 && (
                  <section>
                    <label
                      className="block text-xs font-medium mb-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Available Columns
                    </label>
                    <div className="space-y-1">
                      {columns.map((col) => (
                        <div
                          key={col.name}
                          className="flex items-center justify-between px-2 py-1 text-xs"
                          style={{
                            background: "var(--bg-elevated)",
                            borderRadius: "2px",
                          }}
                        >
                          <span
                            className="font-mono"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {col.name}
                          </span>
                          <div className="flex items-center gap-1">
                            {col.is_temporal && (
                              <span
                                className="text-[10px] px-1"
                                style={{
                                  background: "rgba(32,167,201,0.12)",
                                  color: "var(--accent)",
                                  borderRadius: "2px",
                                }}
                              >
                                T
                              </span>
                            )}
                            <span style={{ color: "var(--text-muted)" }}>
                              {col.type}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Time column + grain */}
                {columns.length > 0 && (
                  <section>
                    <label
                      className="block text-xs font-medium mb-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Time Column
                    </label>
                    <SelectBox
                      value={config.time_column ?? ""}
                      onChange={(v) =>
                        setConfigField("time_column", v || undefined)
                      }
                    >
                      <option value="">— none —</option>
                      {temporalColumns.length > 0 && (
                        <optgroup label="Temporal">
                          {temporalColumns.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {otherColumns.length > 0 && (
                        <optgroup label="All Columns">
                          {otherColumns.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </SelectBox>
                    {config.time_column && (
                      <>
                        <label
                          className="block text-xs font-medium mt-2 mb-1.5"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Time Grain
                        </label>
                        <SelectBox
                          value={config.time_grain ?? ""}
                          onChange={(v) =>
                            setConfigField("time_grain", v || undefined)
                          }
                        >
                          {TIME_GRAINS.map((g) => (
                            <option key={String(g.value)} value={g.value ?? ""}>
                              {g.label}
                            </option>
                          ))}
                        </SelectBox>
                      </>
                    )}
                  </section>
                )}

                {/* Config fields from schema (dimension / metric types) */}
                {chartSchema.fields
                  .filter((f) =>
                    ["dimension", "metric", "metrics"].includes(f.type),
                  )
                  .map((field) => (
                    <section key={String(field.name)}>
                      <label
                        className="block text-xs font-medium mb-1.5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {field.label}
                        {field.required && (
                          <span
                            className="ml-1"
                            style={{ color: "var(--error)" }}
                          >
                            *
                          </span>
                        )}
                      </label>
                      {field.type === "metrics" ? (
                        <div className="space-y-1">
                          {(config.metrics ?? []).map((m, i) => (
                            <div key={i} className="flex gap-1">
                              <div className="relative flex-1">
                                <select
                                  value={m}
                                  onChange={(e) => {
                                    const next = [...(config.metrics ?? [])];
                                    next[i] = e.target.value;
                                    setConfigField("metrics", next);
                                  }}
                                  className="w-full text-xs px-2 py-1 outline-none"
                                  style={{
                                    background: "var(--bg-elevated)",
                                    border: "1px solid var(--bg-border)",
                                    color: "var(--text-primary)",
                                    borderRadius: "2px",
                                    appearance: "none",
                                    WebkitAppearance: "none",
                                    paddingRight: "28px",
                                  }}
                                >
                                  <MetricOptions />
                                </select>
                                <svg
                                  className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2"
                                  style={{
                                    display: "block",
                                    color: "var(--text-muted)",
                                  }}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </div>
                              <button
                                onClick={() =>
                                  setConfigField(
                                    "metrics",
                                    (config.metrics ?? []).filter(
                                      (_, j) => j !== i,
                                    ),
                                  )
                                }
                                className="px-1.5 transition-colors"
                                style={{ color: "var(--text-muted)" }}
                                onMouseEnter={(e) =>
                                  ((
                                    e.currentTarget as HTMLButtonElement
                                  ).style.color = "var(--error)")
                                }
                                onMouseLeave={(e) =>
                                  ((
                                    e.currentTarget as HTMLButtonElement
                                  ).style.color = "var(--text-muted)")
                                }
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() =>
                              setConfigField("metrics", [
                                ...(config.metrics ?? []),
                                "",
                              ])
                            }
                            className="text-xs transition-colors"
                            style={{ color: "var(--accent)" }}
                          >
                            + Add metric
                          </button>
                        </div>
                      ) : field.name === "metric" ||
                        field.name === "comparison_metric" ||
                        field.name === "bubble_size" ? (
                        /* Single metric field — show saved metrics + columns */
                        <div className="relative">
                          <select
                            value={String(
                              config[field.name as keyof ChartConfig] ?? "",
                            )}
                            onChange={(e) =>
                              setConfigField(
                                field.name as keyof ChartConfig,
                                e.target.value,
                              )
                            }
                            className="w-full text-xs px-2.5 py-1.5 outline-none"
                            style={{
                              background: "var(--bg-elevated)",
                              border: "1px solid var(--bg-border)",
                              color: "var(--text-primary)",
                              borderRadius: "2px",
                              appearance: "none",
                              WebkitAppearance: "none",
                              paddingRight: "28px",
                            }}
                          >
                            <MetricOptions />
                          </select>
                          <svg
                            className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2"
                            style={{
                              display: "block",
                              color: "var(--text-muted)",
                            }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      ) : (
                        <SelectBox
                          value={String(
                            config[field.name as keyof ChartConfig] ?? "",
                          )}
                          onChange={(v) =>
                            setConfigField(field.name as keyof ChartConfig, v)
                          }
                        >
                          <option value="">— column —</option>
                          {columns.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </SelectBox>
                      )}
                    </section>
                  ))}
              </>
            ) : leftTab === "customize" ? (
              /* Customize tab */
              <>
                {/* Chart-type-specific options */}
                {chartSchema.fields
                  .filter(
                    (f) => !["dimension", "metric", "metrics"].includes(f.type),
                  )
                  .map((field) => (
                    <section key={String(field.name)}>
                      <label
                        className="block text-xs font-medium mb-1.5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {field.label}
                      </label>
                      {field.type === "boolean" ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(
                              config[field.name as keyof ChartConfig] ??
                              field.defaultValue,
                            )}
                            onChange={(e) =>
                              setConfigField(
                                field.name as keyof ChartConfig,
                                e.target.checked,
                              )
                            }
                            style={{ accentColor: "var(--accent)" }}
                          />
                          <span
                            className="text-xs"
                            style={{ color: "var(--text-primary)" }}
                          >
                            Enabled
                          </span>
                        </label>
                      ) : field.type === "select" ? (
                        <SelectBox
                          value={String(
                            config[field.name as keyof ChartConfig] ??
                              field.defaultValue ??
                              "",
                          )}
                          onChange={(v) =>
                            setConfigField(field.name as keyof ChartConfig, v)
                          }
                        >
                          {field.choices?.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </SelectBox>
                      ) : (
                        <input
                          value={String(
                            config[field.name as keyof ChartConfig] ??
                              field.defaultValue ??
                              "",
                          )}
                          onChange={(e) =>
                            setConfigField(
                              field.name as keyof ChartConfig,
                              e.target.value,
                            )
                          }
                          className="w-full text-xs px-2.5 py-1.5 outline-none"
                          style={{
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--bg-border)",
                            color: "var(--text-primary)",
                            borderRadius: "2px",
                          }}
                        />
                      )}
                    </section>
                  ))}

                {/* Common options */}
                <section>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Title
                  </label>
                  <input
                    value={String(config.title ?? "")}
                    onChange={(e) => setConfigField("title", e.target.value)}
                    placeholder="Chart title override…"
                    className="w-full text-xs px-2.5 py-1.5 outline-none"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--bg-border)",
                      color: "var(--text-primary)",
                      borderRadius: "2px",
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = "var(--accent)")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "var(--bg-border)")
                    }
                  />
                </section>
                <section>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Description
                  </label>
                  <textarea
                    value={String(config.description ?? "")}
                    onChange={(e) =>
                      setConfigField("description", e.target.value)
                    }
                    rows={2}
                    className="w-full text-xs px-2.5 py-1.5 outline-none resize-none"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--bg-border)",
                      color: "var(--text-primary)",
                      borderRadius: "2px",
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = "var(--accent)")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "var(--bg-border)")
                    }
                  />
                </section>
                <section>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showLegend !== false}
                      onChange={(e) =>
                        setConfigField("showLegend", e.target.checked)
                      }
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Show Legend
                    </span>
                  </label>
                </section>

                {/* Row limit */}
                <section>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Row Limit
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50000}
                    value={config.row_limit ?? ""}
                    onChange={(e) =>
                      setConfigField(
                        "row_limit",
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                    placeholder="Default (no limit)"
                    className="w-full text-xs px-2.5 py-1.5 outline-none"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--bg-border)",
                      color: "var(--text-primary)",
                      borderRadius: "2px",
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = "var(--accent)")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "var(--bg-border)")
                    }
                  />
                </section>

                {/* Order by */}
                <section>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Order By
                  </label>
                  <div className="flex gap-1.5">
                    <div className="flex-1">
                      <SelectBox
                        value={config.order_by ?? ""}
                        onChange={(v) =>
                          setConfigField("order_by", v || undefined)
                        }
                      >
                        <option value="">— none —</option>
                        {columns.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </SelectBox>
                    </div>
                    {config.order_by && (
                      <div style={{ width: 70 }}>
                        <SelectBox
                          value={config.sort_order ?? "ASC"}
                          onChange={(v) =>
                            setConfigField("sort_order", v as "ASC" | "DESC")
                          }
                        >
                          <option value="ASC">ASC</option>
                          <option value="DESC">DESC</option>
                        </SelectBox>
                      </div>
                    )}
                  </div>
                </section>

                {/* Auto refresh */}
                <section>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Auto Refresh
                  </label>
                  <SelectBox
                    value={String(config.refresh_frequency ?? 0)}
                    onChange={(v) =>
                      setConfigField(
                        "refresh_frequency",
                        Number(v) || undefined,
                      )
                    }
                  >
                    {AUTO_REFRESH_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </SelectBox>
                </section>
              </>
            ) : (
              /* Filters tab */
              <>
                <section>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Chart Filters
                    <span
                      className="ml-1.5 font-normal"
                      style={{ color: "var(--text-muted)" }}
                    >
                      — Exclusively for this chart
                    </span>
                  </label>
                  <div className="space-y-2">
                    {filters.map((f, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex gap-1">
                          <div className="flex-1">
                            <SelectBox
                              value={f.column}
                              onChange={(v) => updateFilter(i, { column: v })}
                            >
                              <option value="">— column —</option>
                              {columns.map((c) => (
                                <option key={c.name} value={c.name}>
                                  {c.name}
                                </option>
                              ))}
                            </SelectBox>
                          </div>
                          <button
                            onClick={() => removeFilter(i)}
                            className="px-1.5 text-xs transition-colors"
                            style={{ color: "var(--text-muted)" }}
                            onMouseEnter={(e) =>
                              ((
                                e.currentTarget as HTMLButtonElement
                              ).style.color = "var(--error)")
                            }
                            onMouseLeave={(e) =>
                              ((
                                e.currentTarget as HTMLButtonElement
                              ).style.color = "var(--text-muted)")
                            }
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex gap-1">
                          <div style={{ width: 90 }}>
                            <SelectBox
                              value={f.operator}
                              onChange={(v) =>
                                updateFilter(i, {
                                  operator: v as FilterItem["operator"],
                                })
                              }
                            >
                              {FILTER_OPERATORS.map((op) => (
                                <option key={op} value={op}>
                                  {op}
                                </option>
                              ))}
                            </SelectBox>
                          </div>
                          <input
                            value={
                              Array.isArray(f.value)
                                ? (f.value as unknown[]).join(", ")
                                : String(f.value ?? "")
                            }
                            onChange={(e) => {
                              const op = f.operator;
                              const val =
                                op === "in" || op === "not in"
                                  ? e.target.value
                                      .split(",")
                                      .map((v) => v.trim())
                                  : e.target.value;
                              updateFilter(i, { value: val });
                            }}
                            placeholder={
                              f.operator === "in" || f.operator === "not in"
                                ? "a, b, c"
                                : "value"
                            }
                            className="flex-1 text-xs px-2 py-1.5 outline-none"
                            style={{
                              background: "var(--bg-elevated)",
                              border: "1px solid var(--bg-border)",
                              color: "var(--text-primary)",
                              borderRadius: "2px",
                            }}
                            onFocus={(e) =>
                              (e.currentTarget.style.borderColor =
                                "var(--accent)")
                            }
                            onBlur={(e) =>
                              (e.currentTarget.style.borderColor =
                                "var(--bg-border)")
                            }
                          />
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={addFilter}
                      className="text-xs transition-colors"
                      style={{ color: "var(--accent)" }}
                    >
                      + Add Filter
                    </button>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>

        {/* Center preview */}
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{ background: "var(--bg-base)" }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2 text-xs"
            style={{
              borderBottom: "1px solid var(--bg-border)",
              background: "var(--bg-surface)",
              color: "var(--text-muted)",
            }}
          >
            <span>Live Preview</span>
            {isPreviewLoading && (
              <span style={{ color: "var(--accent)" }}>
                <RefreshCw size={12} className="animate-spin" />
              </span>
            )}
            {!datasetId && (
              <span style={{ color: "var(--text-muted)" }}>
                — select a dataset to preview
              </span>
            )}
          </div>

          <div className="flex-1 p-6">
            {previewError ? (
              <div
                className="flex h-full items-center justify-center text-sm"
                style={{ color: "var(--error)" }}
              >
                {previewError}
              </div>
            ) : isPreviewLoading || !previewData ? (
              <div className="flex h-full items-center justify-center">
                {isPreviewLoading ? (
                  <div
                    className="text-sm animate-pulse"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Loading preview…
                  </div>
                ) : (
                  <div
                    className="text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {datasetId
                      ? "Configure the chart to see a preview"
                      : "Select a dataset to get started"}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full">
                <ChartComponent
                  data={transformedPreview?.data ?? previewData.data}
                  config={transformedPreview?.config ?? previewData.config}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
