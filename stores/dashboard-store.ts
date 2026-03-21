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
  /** "chart" (default) or "markdown" text panel. */
  type?: "chart" | "markdown";
  /** Markdown content for type === "markdown". */
  content?: string;
  /** Number of grid columns this panel spans (1–12). */
  colSpan: number;
  /** Number of grid rows this panel spans. */
  rowSpan: number;
};

/** A named tab containing its own layout. */
export type DashboardTab = {
  id: string;
  name: string;
  layout: LayoutItem[];
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
  layout: unknown | null;
  filterConfig: FilterConfigItem[] | null;
  isPublished: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type DashboardState = {
  /** The currently loaded dashboard record. */
  dashboard: DashboardData | null;
  /** All tabs; each tab has its own layout. */
  tabs: DashboardTab[];
  /** ID of the currently active tab. */
  activeTabId: string | null;
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
  /** Adds a new chart panel to the active tab. */
  addChart: (chartId: string) => void;
  removePanel: (panelId: string) => void;
  setFilter: (column: string, value: FilterValue) => void;
  clearFilter: (column: string) => void;
  clearAllFilters: () => void;
  /** Updates colSpan / rowSpan of a panel. */
  updatePanelSize: (panelId: string, size: { colSpan?: number; rowSpan?: number }) => void;
  /** Adds a markdown text panel to the active tab. */
  addMarkdownPanel: () => void;
  /** Updates the markdown content of a panel. */
  updatePanelContent: (panelId: string, content: string) => void;
  /** Tab management. */
  addTab: () => void;
  removeTab: (tabId: string) => void;
  renameTab: (tabId: string, name: string) => void;
  setActiveTab: (tabId: string) => void;
  /** Persists layout + filterConfig to the server. */
  saveDashboard: () => Promise<void>;
  /** Toggles the dashboard's is_published flag. */
  publishDashboard: () => Promise<void>;
  reset: () => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Detects whether the stored layout is in the new tabbed format. */
function isTabsFormat(raw: unknown): raw is DashboardTab[] {
  return (
    Array.isArray(raw) &&
    raw.length > 0 &&
    typeof (raw[0] as Record<string, unknown>).name === "string" &&
    Array.isArray((raw[0] as Record<string, unknown>).layout)
  );
}

/** Normalises any stored layout value into the tabs array format. */
function normaliseTabs(raw: unknown): DashboardTab[] {
  if (!raw) {
    const id = createId();
    return [{ id, name: "Tab 1", layout: [] }];
  }
  if (isTabsFormat(raw)) return raw;
  // Legacy: flat LayoutItem[] → wrap in a single default tab
  const id = createId();
  return [{ id, name: "Tab 1", layout: raw as LayoutItem[] }];
}

function updateActiveTabLayout(
  tabs: DashboardTab[],
  activeTabId: string | null,
  updater: (layout: LayoutItem[]) => LayoutItem[],
): DashboardTab[] {
  return tabs.map((t) =>
    t.id === activeTabId ? { ...t, layout: updater(t.layout) } : t,
  );
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const initialState: DashboardState = {
  dashboard: null,
  tabs: [],
  activeTabId: null,
  filters: {},
  isEditMode: false,
  isDirty: false,
  activePanelId: null,
};

/**
 * Dashboard editor and viewer state.
 * Manages tabs, layout, active filters, edit mode, and chart panel states.
 */
export const useDashboardStore = create<DashboardState & DashboardActions>()(
  (set, get) => ({
    ...initialState,

    loadDashboard: async (id) => {
      const res = await fetch(`/api/dashboards/${id}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const dashboard = json.data as DashboardData;
      const tabs = normaliseTabs(dashboard.layout);
      set({
        dashboard,
        tabs,
        activeTabId: tabs[0]?.id ?? null,
        filters: {},
        isEditMode: false,
        isDirty: false,
        activePanelId: null,
      });
    },

    setEditMode: (enabled) => set({ isEditMode: enabled }),

    updateLayout: (layout) =>
      set((state) => ({
        tabs: updateActiveTabLayout(state.tabs, state.activeTabId, () => layout),
        isDirty: true,
      })),

    addChart: (chartId) =>
      set((state) => ({
        tabs: updateActiveTabLayout(state.tabs, state.activeTabId, (layout) => [
          ...layout,
          { id: createId(), chartId, type: "chart", colSpan: 6, rowSpan: 4 },
        ]),
        isDirty: true,
      })),

    removePanel: (panelId) =>
      set((state) => ({
        tabs: updateActiveTabLayout(state.tabs, state.activeTabId, (layout) =>
          layout.filter((p) => p.id !== panelId),
        ),
        isDirty: true,
      })),

    setFilter: (column, value) =>
      set((state) => ({
        filters: { ...state.filters, [column]: value },
      })),

    clearFilter: (column) =>
      set((state) => {
        const rest = { ...state.filters };
        delete rest[column];
        return { filters: rest };
      }),

    clearAllFilters: () => set({ filters: {} }),

    updatePanelSize: (panelId, size) =>
      set((state) => ({
        tabs: updateActiveTabLayout(state.tabs, state.activeTabId, (layout) =>
          layout.map((p) => (p.id === panelId ? { ...p, ...size } : p)),
        ),
        isDirty: true,
      })),

    addMarkdownPanel: () =>
      set((state) => ({
        tabs: updateActiveTabLayout(state.tabs, state.activeTabId, (layout) => [
          ...layout,
          {
            id: createId(),
            chartId: "",
            type: "markdown",
            content: "## New Text Panel\n\nEdit this text in edit mode.",
            colSpan: 6,
            rowSpan: 3,
          },
        ]),
        isDirty: true,
      })),

    updatePanelContent: (panelId, content) =>
      set((state) => ({
        tabs: updateActiveTabLayout(state.tabs, state.activeTabId, (layout) =>
          layout.map((p) => (p.id === panelId ? { ...p, content } : p)),
        ),
        isDirty: true,
      })),

    addTab: () =>
      set((state) => {
        const newTab: DashboardTab = {
          id: createId(),
          name: `Tab ${state.tabs.length + 1}`,
          layout: [],
        };
        return { tabs: [...state.tabs, newTab], activeTabId: newTab.id, isDirty: true };
      }),

    removeTab: (tabId) =>
      set((state) => {
        const tabs = state.tabs.filter((t) => t.id !== tabId);
        const activeTabId =
          state.activeTabId === tabId ? (tabs[0]?.id ?? null) : state.activeTabId;
        return { tabs, activeTabId, isDirty: true };
      }),

    renameTab: (tabId, name) =>
      set((state) => ({
        tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, name } : t)),
        isDirty: true,
      })),

    setActiveTab: (tabId) => set({ activeTabId: tabId }),

    saveDashboard: async () => {
      const { dashboard, tabs } = get();
      if (!dashboard) return;
      const res = await fetch(`/api/dashboards/${dashboard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout: tabs }),
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
