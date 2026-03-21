"use client";

import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Time grain options for date range filters. */
export type TimeGrain = "PT1M" | "PT1H" | "P1D" | "P1W" | "P1M" | "P1Y";

/** The typed value of an active filter. */
export type FilterValue =
  | { type: "date_range"; from: string | null; to: string | null; grain?: TimeGrain }
  | { type: "select"; values: string[] }
  | { type: "search"; query: string };

/** Persisted configuration for a single filter widget on a dashboard. */
export interface FilterConfig {
  /** Stable UUID for this filter. */
  id: string;
  dashboardId: string;
  label: string;
  type: "date_range" | "select" | "search";
  /** Column name to inject into the WHERE clause. */
  column: string;
  /** Dataset to load options from (select widget). */
  datasetId: string;
  /** Chart IDs this filter targets. Empty = all charts on the dashboard. */
  targetChartIds: string[];
}

type FilterState = {
  configs: Record<string, FilterConfig>;
  values: Record<string, FilterValue>;
};

type FilterActions = {
  /** Returns all filter configs belonging to a specific dashboard. */
  activeFilters: (dashboardId: string) => FilterConfig[];
  /** Returns the current value for a filter, if set. */
  getValue: (filterId: string) => FilterValue | undefined;
  /**
   * Returns all filter entries that should be applied to a specific chart.
   * A filter applies when its targetChartIds is empty (global) or includes chartId.
   * Filters with empty/null values are excluded.
   */
  getAppliedFilters: (
    dashboardId: string,
    chartId: string,
  ) => Array<{ column: string; value: FilterValue }>;
  /** Sets or updates the value for a filter. */
  setFilter: (filterId: string, value: FilterValue) => void;
  /** Clears the value for a single filter. */
  clearFilter: (filterId: string) => void;
  /** Clears all filter values for a dashboard. */
  clearAllFilters: (dashboardId: string) => void;
  /** Adds or updates a filter config. */
  upsertConfig: (config: FilterConfig) => void;
  /** Removes a filter config and its value. */
  removeConfig: (filterId: string) => void;
  /**
   * Hydrates filter configs from the API on dashboard load.
   * Replaces any existing configs for the given dashboard.
   */
  loadConfigs: (dashboardId: string, configs: FilterConfig[]) => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isEmptyValue(val: FilterValue): boolean {
  if (val.type === "date_range") return !val.from && !val.to;
  if (val.type === "select") return val.values.length === 0;
  if (val.type === "search") return !val.query.trim();
  return true;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * Native filter bar state store.
 * Manages filter widget configurations (persisted per dashboard) and
 * their current runtime values (in-memory only, reset on page load).
 */
export const useFilterStore = create<FilterState & FilterActions>()(
  (set, get) => ({
    configs: {},
    values: {},

    activeFilters: (dashboardId) =>
      Object.values(get().configs).filter((c) => c.dashboardId === dashboardId),

    getValue: (filterId) => get().values[filterId],

    getAppliedFilters: (dashboardId, chartId) => {
      const { configs, values } = get();
      return Object.values(configs)
        .filter(
          (c) =>
            c.dashboardId === dashboardId &&
            (c.targetChartIds.length === 0 ||
              c.targetChartIds.includes(chartId)),
        )
        .flatMap((c) => {
          const val = values[c.id];
          if (!val || isEmptyValue(val)) return [];
          return [{ column: c.column, value: val }];
        });
    },

    setFilter: (filterId, value) =>
      set((state) => ({ values: { ...state.values, [filterId]: value } })),

    clearFilter: (filterId) =>
      set((state) => {
        const rest = { ...state.values };
        delete rest[filterId];
        return { values: rest };
      }),

    clearAllFilters: (dashboardId) =>
      set((state) => {
        const dashboardFilterIds = new Set(
          Object.values(state.configs)
            .filter((c) => c.dashboardId === dashboardId)
            .map((c) => c.id),
        );
        const values = { ...state.values };
        for (const id of dashboardFilterIds) delete values[id];
        return { values };
      }),

    upsertConfig: (config) =>
      set((state) => ({
        configs: { ...state.configs, [config.id]: config },
      })),

    removeConfig: (filterId) =>
      set((state) => {
        const configs = { ...state.configs };
        const values = { ...state.values };
        delete configs[filterId];
        delete values[filterId];
        return { configs, values };
      }),

    loadConfigs: (dashboardId, configs) =>
      set((state) => {
        // Keep configs for other dashboards, replace for this one
        const preserved = Object.values(state.configs).filter(
          (c) => c.dashboardId !== dashboardId,
        );
        const next: Record<string, FilterConfig> = {};
        for (const c of preserved) next[c.id] = c;
        for (const c of configs) next[c.id] = { ...c, dashboardId };
        return { configs: next };
      }),
  }),
);
