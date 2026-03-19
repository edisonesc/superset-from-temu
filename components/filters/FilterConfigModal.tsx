"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { useFilterStore, type FilterConfig } from "@/stores/filterStore";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const FilterConfigSchema = z.object({
  label: z.string().min(1, "Label is required"),
  type: z.enum(["date_range", "select", "search"]),
  column: z.string().min(1, "Column is required"),
  datasetId: z.string(),
  targetChartIds: z.array(z.string()),
});

type FormErrors = Partial<Record<keyof z.infer<typeof FilterConfigSchema>, string>>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DatasetOption = { id: string; name: string };
type ColumnOption = { name: string; type: string };
type ChartOption = { id: string; name: string };

type Props = {
  dashboardId: string;
  /** Pre-populate for editing an existing config. */
  existing?: FilterConfig;
  /** Charts currently on the dashboard (for targetChartIds selector). */
  dashboardCharts: ChartOption[];
  onClose: () => void;
};

// ---------------------------------------------------------------------------
// FilterConfigModal
// ---------------------------------------------------------------------------

/**
 * Modal for adding or editing a native filter config on a dashboard.
 * Validates with Zod, persists via the filter configs API, and updates the store.
 */
export function FilterConfigModal({
  dashboardId,
  existing,
  dashboardCharts,
  onClose,
}: Props) {
  const upsertConfig = useFilterStore((s) => s.upsertConfig);

  const [label, setLabel] = useState(existing?.label ?? "");
  const [type, setType] = useState<FilterConfig["type"]>(existing?.type ?? "select");
  const [column, setColumn] = useState(existing?.column ?? "");
  const [datasetId, setDatasetId] = useState(existing?.datasetId ?? "");
  const [targetAll, setTargetAll] = useState(!existing || existing.targetChartIds.length === 0);
  const [targetChartIds, setTargetChartIds] = useState<string[]>(
    existing?.targetChartIds ?? [],
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [columns, setColumns] = useState<ColumnOption[]>([]);
  const [loadingColumns, setLoadingColumns] = useState(false);

  // Load available datasets
  useEffect(() => {
    fetch("/api/datasets?pageSize=100")
      .then((r) => r.json())
      .then((json) => {
        if (!json.error) setDatasets(json.data?.data ?? json.data?.items ?? json.data ?? []);
      })
      .catch(() => {});
  }, []);

  // Load columns when dataset changes
  useEffect(() => {
    if (!datasetId) { setColumns([]); return; }
    setLoadingColumns(true);
    fetch(`/api/datasets/${datasetId}/columns`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.error) setColumns(json.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingColumns(false));
  }, [datasetId]);

  function toggleChart(id: string) {
    setTargetChartIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  async function handleSave() {
    const result = FilterConfigSchema.safeParse({
      label,
      type,
      column,
      datasetId,
      targetChartIds: targetAll ? [] : targetChartIds,
    });

    if (!result.success) {
      const errs: FormErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormErrors;
        if (key) errs[key] = issue.message;
      }
      setErrors(errs);
      return;
    }

    setErrors({});
    setSaving(true);

    const config: FilterConfig = {
      id: existing?.id ?? createId(),
      dashboardId,
      ...result.data,
    };

    try {
      // Fetch current configs, merge, then persist
      const getRes = await fetch(`/api/dashboards/${dashboardId}/filters`);
      const getJson = await getRes.json();
      const currentConfigs: FilterConfig[] = getJson.data ?? [];

      const idx = currentConfigs.findIndex((c) => c.id === config.id);
      const nextConfigs =
        idx >= 0
          ? currentConfigs.map((c, i) => (i === idx ? config : c))
          : [...currentConfigs, config];

      await fetch(`/api/dashboards/${dashboardId}/filters`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs: nextConfigs }),
      });

      upsertConfig(config);
      onClose();
    } catch {
      setErrors({ label: "Failed to save filter. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full px-2 py-1.5 text-xs outline-none";
  const inputStyle = {
    background: "var(--bg-base)",
    border: "1px solid var(--bg-border)",
    borderRadius: "2px",
    color: "var(--text-primary)",
  };
  const errorStyle = { color: "var(--error)", fontSize: "0.7rem", marginTop: "2px" };
  const labelStyle = { color: "var(--text-secondary)", fontSize: "0.7rem", marginBottom: "3px", display: "block" as const };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex w-full max-w-md flex-col overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: "2px",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--bg-border)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {existing ? "Edit Filter" : "Add Filter"}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-3">
            {/* Label */}
            <div>
              <label style={labelStyle}>Label *</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Date Range"
                className={inputCls}
                style={{ ...inputStyle, borderColor: errors.label ? "var(--error)" : "var(--bg-border)" }}
              />
              {errors.label && <p style={errorStyle}>{errors.label}</p>}
            </div>

            {/* Type */}
            <div>
              <label style={labelStyle}>Filter Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as FilterConfig["type"])}
                className={inputCls}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="date_range">Date Range</option>
                <option value="select">Dimension Select</option>
                <option value="search">Search</option>
              </select>
            </div>

            {/* Dataset (required for select type to load options) */}
            <div>
              <label style={labelStyle}>Dataset</label>
              <select
                value={datasetId}
                onChange={(e) => { setDatasetId(e.target.value); setColumn(""); }}
                className={inputCls}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="">— Select a dataset —</option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Column */}
            <div>
              <label style={labelStyle}>Column *</label>
              {columns.length > 0 ? (
                <select
                  value={column}
                  onChange={(e) => setColumn(e.target.value)}
                  className={inputCls}
                  style={{
                    ...inputStyle,
                    cursor: "pointer",
                    borderColor: errors.column ? "var(--error)" : "var(--bg-border)",
                  }}
                >
                  <option value="">— Select a column —</option>
                  {columns.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={column}
                  onChange={(e) => setColumn(e.target.value)}
                  placeholder={loadingColumns ? "Loading columns…" : "e.g. created_at"}
                  disabled={loadingColumns}
                  className={inputCls}
                  style={{
                    ...inputStyle,
                    borderColor: errors.column ? "var(--error)" : "var(--bg-border)",
                    opacity: loadingColumns ? 0.6 : 1,
                  }}
                />
              )}
              {errors.column && <p style={errorStyle}>{errors.column}</p>}
            </div>

            {/* Target charts */}
            {dashboardCharts.length > 0 && (
              <div>
                <label style={labelStyle}>Target Charts</label>
                <label
                  className="mb-1.5 flex cursor-pointer items-center gap-2 text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <input
                    type="checkbox"
                    checked={targetAll}
                    onChange={(e) => { setTargetAll(e.target.checked); if (e.target.checked) setTargetChartIds([]); }}
                    className="accent-indigo-500"
                  />
                  Apply to all charts
                </label>
                {!targetAll && (
                  <div
                    className="flex flex-col gap-1 overflow-y-auto p-1"
                    style={{
                      background: "var(--bg-base)",
                      border: "1px solid var(--bg-border)",
                      borderRadius: "2px",
                      maxHeight: "120px",
                    }}
                  >
                    {dashboardCharts.map((chart) => (
                      <label
                        key={chart.id}
                        className="flex cursor-pointer items-center gap-2 px-1 py-0.5 text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <input
                          type="checkbox"
                          checked={targetChartIds.includes(chart.id)}
                          onChange={() => toggleChart(chart.id)}
                          className="accent-indigo-500"
                        />
                        {chart.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: "1px solid var(--bg-border)" }}
        >
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs transition-colors"
            style={{ color: "var(--text-secondary)", borderRadius: "2px" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "")}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50"
            style={{ background: "var(--accent)", borderRadius: "2px" }}
            onMouseEnter={(e) => !saving && ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent-deep)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent)")}
          >
            {saving ? "Saving…" : "Save Filter"}
          </button>
        </div>
      </div>
    </div>
  );
}
