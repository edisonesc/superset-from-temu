"use client";

import { useDashboardStore } from "@/stores/dashboard-store";
import type { FilterConfigItem } from "@/stores/dashboard-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterBarProps = {
  filterConfig: FilterConfigItem[];
  isEditMode: boolean;
};

// ---------------------------------------------------------------------------
// FilterChip — displays a single active filter value
// ---------------------------------------------------------------------------

function FilterChip({
  label,
  column,
  value,
  onClear,
}: {
  label: string;
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
      <span className="font-medium" style={{ color: "var(--accent-bright)" }}>{label}:</span>
      <span className="max-w-32 truncate" style={{ color: "var(--text-primary)" }}>{String(value)}</span>
      <button
        onClick={() => onClear(column)}
        className="ml-1 rounded-full p-0.5 transition-colors"
        style={{ color: "var(--text-muted)" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--error)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
        title={`Remove filter: ${label}`}
      >
        <svg
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilterBar
// ---------------------------------------------------------------------------

/**
 * Global filter bar broadcasting filter values to all chart panels.
 * Active filters are shown as dismissible chips.
 * Cross-filter chips (from chart clicks) appear here automatically.
 */
export function FilterBar({ filterConfig, isEditMode }: FilterBarProps) {
  const { filters, clearFilter, clearAllFilters } = useDashboardStore();

  const activeEntries = Object.entries(filters).filter(
    ([, v]) => v !== null && v !== undefined,
  );

  const hasFilters = activeEntries.length > 0;

  return (
    <div
      className="flex min-h-12 flex-wrap items-center gap-2 px-4 py-2"
      style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--bg-border)",
      }}
    >
      {/* Active filter chips */}
      {activeEntries.map(([column, value]) => {
        const configItem = filterConfig.find((f) => f.column === column);
        const label = configItem?.label ?? column;
        return (
          <FilterChip
            key={column}
            label={label}
            column={column}
            value={value}
            onClear={clearFilter}
          />
        );
      })}

      {/* Empty state */}
      {!hasFilters && !isEditMode && (
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          No active filters
        </span>
      )}

      {/* Clear All */}
      {hasFilters && (
        <button
          onClick={clearAllFilters}
          className="ml-1 rounded px-2 py-1 text-xs transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--error)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
          }}
        >
          Clear all
        </button>
      )}

      {/* Edit mode: Add Filter placeholder */}
      {isEditMode && (
        <button
          className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors"
          style={{
            border: "1px dashed var(--bg-border)",
            color: "var(--text-muted)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--bg-border)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
          }}
          onClick={() =>
            alert(
              "Filter builder coming in Phase 5. Cross-filtering via chart clicks is fully functional.",
            )
          }
        >
          <svg
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Filter
        </button>
      )}
    </div>
  );
}
