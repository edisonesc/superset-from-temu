"use client";

import { create } from "zustand";
import { createId } from "@paralleldrive/cuid2";
import type { FilterContext } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single panel in the dashboard grid. */
export type LayoutItem = {
  /** Unique panel ID (not the chart ID). */
  id: string;
  chartId: string;
  /** Number of grid columns this panel spans (1–12). */
  colSpan: number;
  /** Number of grid rows this panel spans. */
  rowSpan: number;
};

/** Value for a single active filter. */
export type FilterValue = unknown;

/** Config for a dashboard filter widget (stored in dashboard.filter_config). */
export type FilterConfigItem = {
  id: string;
  label: string;
  column: string;
  type: "value" | "time_range" | "numerical_range";
  targetChartIds?: string[];
};

type DashboardData = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  layout: LayoutItem[] | null;
  filterConfig: FilterConfigItem[] | null;
  isPublished: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type DashboardState = {
  /** The currently loaded dashboard record. */
  dashboard: DashboardData | null;
  /** Current grid layout — source of truth for panel positions. */
  layout: LayoutItem[];
  /** Active cross-filter values keyed by column name. */
  filters: FilterContext;
  isEditMode: boolean;
  /** True when local state differs from the persisted server state. */
  isDirty: boolean;
  activePanelId: string | null;
};

type DashboardActions = {
  /** Fetches a dashboard by ID and hydrates the store. */
  loadDashboard: (id: string) => Promise<void>;
  setEditMode: (enabled: boolean) => void;
  updateLayout: (layout: LayoutItem[]) => void;
  /** Adds a new panel for the given chartId to the local layout. */
  addChart: (chartId: string) => void;
  removePanel: (panelId: string) => void;
  setFilter: (column: string, value: FilterValue) => void;
  clearFilter: (column: string) => void;
  clearAllFilters: () => void;
  /** Persists layout + filterConfig to the server. */
  saveDashboard: () => Promise<void>;
  /** Toggles the dashboard's is_published flag. */
  publishDashboard: () => Promise<void>;
  reset: () => void;
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const initialState: DashboardState = {
  dashboard: null,
  layout: [],
  filters: {},
  isEditMode: false,
  isDirty: false,
  activePanelId: null,
};

/**
 * Dashboard editor and viewer state.
 * Manages layout, active filters, edit mode, and chart panel states.
 */
export const useDashboardStore = create<DashboardState & DashboardActions>()(
  (set, get) => ({
    ...initialState,

    loadDashboard: async (id) => {
      const res = await fetch(`/api/dashboards/${id}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const dashboard = json.data as DashboardData;
      set({
        dashboard,
        layout: (dashboard.layout as LayoutItem[]) ?? [],
        filters: {},
        isEditMode: false,
        isDirty: false,
        activePanelId: null,
      });
    },

    setEditMode: (enabled) => set({ isEditMode: enabled }),

    updateLayout: (layout) => set({ layout, isDirty: true }),

    addChart: (chartId) =>
      set((state) => {
        const newPanel: LayoutItem = {
          id: createId(),
          chartId,
          colSpan: 6,
          rowSpan: 4,
        };
        return { layout: [...state.layout, newPanel], isDirty: true };
      }),

    removePanel: (panelId) =>
      set((state) => ({
        layout: state.layout.filter((p) => p.id !== panelId),
        isDirty: true,
      })),

    setFilter: (column, value) =>
      set((state) => ({
        filters: { ...state.filters, [column]: value },
      })),

    clearFilter: (column) =>
      set((state) => {
        const { [column]: _, ...rest } = state.filters;
        return { filters: rest };
      }),

    clearAllFilters: () => set({ filters: {} }),

    saveDashboard: async () => {
      const { dashboard, layout } = get();
      if (!dashboard) return;
      const res = await fetch(`/api/dashboards/${dashboard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      set({ dashboard: json.data, isDirty: false });
    },

    publishDashboard: async () => {
      const { dashboard } = get();
      if (!dashboard) return;
      const res = await fetch(`/api/dashboards/${dashboard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !dashboard.isPublished }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      set({ dashboard: json.data });
    },

    reset: () => set(initialState),
  }),
);
