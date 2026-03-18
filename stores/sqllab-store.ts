import { create } from "zustand";
import { createId } from "@paralleldrive/cuid2";
import type { QueryResult } from "@/lib/query-runner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TabStatus = "idle" | "running" | "success" | "error";

/** A single SQL Lab query tab — each tab has its own editor, connection, and results. */
export type QueryTab = {
  id: string;
  name: string;
  sql: string;
  connectionId: string | null;
  results: QueryResult | null;
  status: TabStatus;
  error: string | null;
};

type SqlLabState = {
  tabs: QueryTab[];
  activeTabId: string;
};

type SqlLabActions = {
  addTab: () => void;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  renameTab: (tabId: string, name: string) => void;
  updateTabSql: (tabId: string, sql: string) => void;
  setTabConnection: (tabId: string, connectionId: string) => void;
  setTabResults: (tabId: string, results: QueryResult) => void;
  setTabStatus: (tabId: string, status: TabStatus, error?: string) => void;
};

// ---------------------------------------------------------------------------
// Initial tab
// ---------------------------------------------------------------------------

function createDefaultTab(): QueryTab {
  return {
    id: createId(),
    name: "Query 1",
    sql: "",
    connectionId: null,
    results: null,
    status: "idle",
    error: null,
  };
}

const initialTab = createDefaultTab();

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * SQL Lab editor state store.
 * Manages active query tabs, editor content, execution state, and results.
 */
export const useSqlLabStore = create<SqlLabState & SqlLabActions>()((set) => ({
  tabs: [initialTab],
  activeTabId: initialTab.id,

  addTab: () =>
    set((state) => {
      const newTab: QueryTab = {
        id: createId(),
        name: `Query ${state.tabs.length + 1}`,
        sql: "",
        connectionId: state.tabs.find((t) => t.id === state.activeTabId)?.connectionId ?? null,
        results: null,
        status: "idle",
        error: null,
      };
      return { tabs: [...state.tabs, newTab], activeTabId: newTab.id };
    }),

  removeTab: (tabId) =>
    set((state) => {
      if (state.tabs.length <= 1) return state;
      const remaining = state.tabs.filter((t) => t.id !== tabId);
      const newActiveId =
        state.activeTabId === tabId
          ? (remaining[remaining.length - 1]?.id ?? remaining[0].id)
          : state.activeTabId;
      return { tabs: remaining, activeTabId: newActiveId };
    }),

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  renameTab: (tabId, name) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, name } : t)),
    })),

  updateTabSql: (tabId, sql) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, sql } : t)),
    })),

  setTabConnection: (tabId, connectionId) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, connectionId } : t)),
    })),

  setTabResults: (tabId, results) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, results, status: "success", error: null } : t,
      ),
    })),

  setTabStatus: (tabId, status, error) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, status, error: error ?? (status === "error" ? t.error : null) } : t,
      ),
    })),
}));
