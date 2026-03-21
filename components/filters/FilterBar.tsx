"use client";

import { useState, useMemo } from "react";
import { useFilterStore, type FilterConfig } from "@/stores/filterStore";
import { useDashboardStore } from "@/stores/dashboard-store";
import { DateRangeWidget } from "./widgets/DateRangeWidget";
import { SelectWidget } from "./widgets/SelectWidget";
import { SearchWidget } from "./widgets/SearchWidget";
import { FilterConfigModal } from "./FilterConfigModal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChartOption = { id: string; name: string };

type FilterBarProps = {
  dashboardId: string;
  isEditMode: boolean;
  /** Charts currently on this dashboard — used by FilterConfigModal. */
  dashboardCharts: ChartOption[];
};

// ---------------------------------------------------------------------------
// FilterWidget — renders the correct widget for a filter config
// ---------------------------------------------------------------------------

function FilterWidget({ config }: { config: FilterConfig }) {
  if (config.type === "date_range") return <DateRangeWidget config={config} />;
  if (config.type === "select") return <SelectWidget config={config} />;
  if (config.type === "search") return <SearchWidget config={config} />;
  return null;
}

// ---------------------------------------------------------------------------
// FilterTypeIcon — small accent icon indicating filter type
// ---------------------------------------------------------------------------

function FilterTypeIcon({ type }: { type: FilterConfig["type"] }) {
  return (
    <svg
      className="h-3 w-3 shrink-0"
      style={{ color: "var(--accent)", display: "block" }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      {type === "date_range" && (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      )}
      {type === "select" && (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 6h16M4 10h16M4 14h10"
        />
      )}
      {type === "search" && (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
        />
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// CrossFilterChip — dismissible chip for chart-click cross-filters
// ---------------------------------------------------------------------------

function CrossFilterChip({
  column,
  value,
  onClear,
}: {
  column: string;
  value: unknown;
  onClear: (column: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-1 rounded-full px-3 py-1 text-xs"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--bg-border)",
        borderLeft: "2px solid var(--accent)",
        color: "var(--text-secondary)",
        boxShadow: "0 0 12px rgba(99,102,241,0.12)",
      }}
    >
      <span className="font-medium" style={{ color: "var(--accent-bright)" }}>
        {column}:
      </span>
      <span className="max-w-32 truncate" style={{ color: "var(--text-primary)" }}>
        {String(value)}
      </span>
      <button
        onClick={() => onClear(column)}
        className="ml-1 rounded-full p-0.5 transition-colors"
        style={{ color: "var(--text-muted)" }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.color = "var(--error)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")
        }
        title={`Remove filter: ${column}`}
      >
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilterBar
// ---------------------------------------------------------------------------

/**
 * Native filter bar for the dashboard page.
 * Renders a collapsible panel with:
 *  - One widget per FilterConfig (date range, select, search)
 *  - Cross-filter chips from chart element clicks
 *  - Add Filter button (edit mode only)
 *  - Clear All button
 */
export function FilterBar({ dashboardId, isEditMode, dashboardCharts }: FilterBarProps) {
  const allConfigs = useFilterStore((s) => s.configs);
  const nativeValues = useFilterStore((s) => s.values);

  const nativeConfigs = useMemo(
    () => Object.values(allConfigs).filter((c) => c.dashboardId === dashboardId),
    [allConfigs, dashboardId],
  );
  const clearNativeFilter = useFilterStore((s) => s.clearFilter);
  const clearAllNativeFilters = useFilterStore((s) => s.clearAllFilters);
  const removeConfig = useFilterStore((s) => s.removeConfig);

  // Cross-filter state from dashboard store
  const crossFilters = useDashboardStore((s) => s.filters);
  const clearCrossFilter = useDashboardStore((s) => s.clearFilter);
  const clearAllCrossFilters = useDashboardStore((s) => s.clearAllFilters);

  const [collapsed, setCollapsed] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<FilterConfig | undefined>();

  const crossFilterEntries = Object.entries(crossFilters).filter(
    ([, v]) => v !== null && v !== undefined,
  );

  const hasNativeValues = nativeConfigs.some((c) => {
    const val = nativeValues[c.id];
    if (!val) return false;
    if (val.type === "date_range") return !!(val.from || val.to);
    if (val.type === "select") return val.values.length > 0;
    if (val.type === "search") return !!val.query.trim();
    return false;
  });

  const hasAnything =
    nativeConfigs.length > 0 || crossFilterEntries.length > 0;

  function handleClearAll() {
    clearAllNativeFilters(dashboardId);
    clearAllCrossFilters();
  }

  async function handleDeleteConfig(configId: string) {
    // Remove from store
    removeConfig(configId);
    // Persist removal to API
    try {
      const res = await fetch(`/api/dashboards/${dashboardId}/filters`);
      const json = await res.json();
      const current: FilterConfig[] = json.data ?? [];
      await fetch(`/api/dashboards/${dashboardId}/filters`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs: current.filter((c) => c.id !== configId) }),
      });
    } catch {
      // Best-effort — store is already updated
    }
  }

  // Don't render if nothing and not in edit mode
  if (!hasAnything && !isEditMode) return null;

  return (
    <>
      <div
        style={{
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--bg-border)",
        }}
      >
        {/* Toolbar row */}
        <div className="flex min-h-10 items-center gap-2 px-4 py-1.5">
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")
            }
            title={collapsed ? "Expand filters" : "Collapse filters"}
          >
            {/* Funnel icon */}
            <svg className="h-3.5 w-3.5" style={{ display: "block" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 10h10M11 16h2" />
            </svg>
            <span>Filters</span>
            {nativeConfigs.length > 0 && (
              <span
                className="rounded-full px-1.5 py-0.5"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--bg-border)",
                  color: hasNativeValues ? "var(--accent-bright)" : "var(--text-muted)",
                  fontSize: "0.65rem",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {nativeConfigs.length}
              </span>
            )}
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{
                display: "block",
                transform: collapsed ? "rotate(-90deg)" : undefined,
                transition: "transform 0.15s",
              }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Cross-filter chips (always visible in toolbar) */}
          {crossFilterEntries.map(([col, val]) => (
            <CrossFilterChip
              key={col}
              column={col}
              value={val}
              onClear={clearCrossFilter}
            />
          ))}

          <div className="flex-1" />

          {/* Clear All */}
          {(hasNativeValues || crossFilterEntries.length > 0) && (
            <button
              onClick={handleClearAll}
              className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = "var(--error)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")
              }
            >
              Clear all
            </button>
          )}

          {/* Add Filter (edit mode) */}
          {isEditMode && (
            <button
              onClick={() => { setEditingConfig(undefined); setShowAddModal(true); }}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs transition-colors"
              style={{
                border: "1.5px dashed var(--bg-border)",
                color: "var(--text-muted)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--bg-border)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
              }}
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Filter
            </button>
          )}
        </div>

        {/* Filter widgets row */}
        {!collapsed && nativeConfigs.length > 0 && (
          <div
            className="flex flex-wrap gap-3 px-4 pt-2.5 pb-4"
            style={{ borderTop: "1px solid var(--bg-border)" }}
          >
            {nativeConfigs.map((config) => (
              <div
                key={config.id}
                className="flex flex-col gap-2"
                style={{
                  minWidth: config.type === "date_range" ? "380px" : "180px",
                  maxWidth: config.type === "date_range" ? "480px" : "260px",
                  flex: config.type === "date_range" ? "1 1 380px" : "1 1 180px",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--bg-border)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                }}
              >
                {/* Widget label + edit/delete actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FilterTypeIcon type={config.type} />
                    <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      {config.label}
                    </span>
                  </div>
                  {isEditMode && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingConfig(config); setShowAddModal(true); }}
                        className="rounded p-0.5 transition-colors"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.color = "var(--accent)")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")
                        }
                        title="Edit filter"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteConfig(config.id)}
                        className="rounded p-0.5 transition-colors"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.color = "var(--error)")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")
                        }
                        title="Delete filter"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => clearNativeFilter(config.id)}
                        className="rounded p-0.5 transition-colors"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")
                        }
                        title="Clear value"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                <FilterWidget config={config} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter config modal */}
      {showAddModal && (
        <FilterConfigModal
          dashboardId={dashboardId}
          existing={editingConfig}
          dashboardCharts={dashboardCharts}
          onClose={() => { setShowAddModal(false); setEditingConfig(undefined); }}
        />
      )}
    </>
  );
}
