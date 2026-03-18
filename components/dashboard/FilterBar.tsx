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
    <div className="flex items-center gap-1 rounded-full border border-blue-700/50 bg-blue-900/30 px-3 py-1 text-xs text-blue-300">
      <span className="font-medium">{label}:</span>
      <span className="max-w-32 truncate">{String(value)}</span>
      <button
        onClick={() => onClear(column)}
        className="ml-1 rounded-full p-0.5 hover:bg-blue-800/50"
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
    <div className="flex min-h-10 flex-wrap items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-2">
      {/* Active filter chips */}
      {activeEntries.map(([column, value]) => {
        // Look up label from filterConfig; fall back to column name
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
        <span className="text-xs text-zinc-600">No active filters</span>
      )}

      {/* Clear All */}
      {hasFilters && (
        <button
          onClick={clearAllFilters}
          className="ml-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        >
          Clear all
        </button>
      )}

      {/* Edit mode: Add Filter placeholder */}
      {isEditMode && (
        <button
          className="flex items-center gap-1 rounded border border-dashed border-zinc-700 px-2 py-1 text-xs text-zinc-500 hover:border-zinc-500 hover:text-zinc-400"
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
