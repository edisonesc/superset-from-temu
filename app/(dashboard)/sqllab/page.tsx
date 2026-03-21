"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { format as formatSql } from "sql-formatter";
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  flexRender, type ColumnDef, type SortingState,
} from "@tanstack/react-table";
import { useSqlLabStore } from "@/stores/sqllab-store";
import SqlEditor from "@/components/sqllab/SqlEditor";
import ResizeHandle from "@/components/sqllab/ResizeHandle";
import type { QueryResult } from "@/lib/query-runner";
import type { SchemaTable } from "@/app/api/connections/[id]/schema/route";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Connection = { id: string; name: string; dialect: string };
type HistoryItem = { id: string; sql: string; status: "success" | "error"; rowCount: number | null; durationMs: number | null; createdAt: string };
type SavedQuery = { id: string; name: string; sql: string; connectionId: string; createdAt: string };

// ---------------------------------------------------------------------------
// Shared style helpers
// ---------------------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--bg-border)",
  color: "var(--text-primary)",
  borderRadius: "2px",
};

const ghostBtnStyle: React.CSSProperties = {
  color: "var(--text-secondary)",
  borderRadius: "2px",
  padding: "4px 8px",
};

// ---------------------------------------------------------------------------
// Results Table
// ---------------------------------------------------------------------------

function ResultsTable({ result }: { result: QueryResult }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns: ColumnDef<Record<string, unknown>>[] = result.columns.map((col) => ({
    id: col.name,
    accessorKey: col.name,
    header: () => (
      <div className="flex flex-col gap-0.5">
        <span>{col.name}</span>
        <span className="text-[10px] font-normal" style={{ color: "var(--text-muted)" }}>{col.type}</span>
      </div>
    ),
    cell: ({ getValue }) => {
      const v = getValue();
      if (v === null || v === undefined)
        return <span className="italic" style={{ color: "var(--text-muted)" }}>NULL</span>;
      return String(v);
    },
  }));

  const table = useReactTable({
    data: result.rows, columns,
    state: { sorting }, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
  });

  const exportCsv = useCallback(() => {
    const headers = result.columns.map((c) => c.name).join(",");
    const rows = result.rows.map((row) =>
      result.columns.map((c) => {
        const v = row[c.name];
        if (v === null || v === undefined) return "";
        const s = String(v);
        return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(","),
    );
    const blob = new Blob([[headers, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "query_results.csv"; a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ borderBottom: "1px solid var(--bg-border)" }}
      >
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {result.rowCount.toLocaleString()} rows · {result.durationMs}ms
        </span>
        <button
          onClick={exportCsv}
          className="rounded px-2 py-1 text-xs transition-colors"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "")}
        >
          Export CSV
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0" style={{ background: "var(--bg-elevated)" }}>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer px-3 py-2 text-left font-semibold uppercase tracking-wide transition-colors"
                    style={{ borderBottom: "1px solid var(--bg-border)", color: "var(--text-secondary)", fontSize: "10px" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLTableCellElement).style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLTableCellElement).style.background = "")}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === "asc" && <span style={{ color: "var(--accent)" }}>↑</span>}
                      {header.column.getIsSorted() === "desc" && <span style={{ color: "var(--accent)" }}>↓</span>}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => (
              <tr
                key={row.id}
                style={{ background: i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)")}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-3 py-1.5 font-mono"
                    style={{ borderBottom: "1px solid var(--bg-border)", color: "var(--text-primary)" }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {result.rows.length === 0 && (
          <div className="flex h-24 items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
            No results
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schema Browser
// ---------------------------------------------------------------------------

function SchemaBrowser({ connections, onInsertTable }: { connections: Connection[]; onInsertTable: (t: string) => void }) {
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const { data: schemaData } = useQuery({
    queryKey: ["schema", selectedConnectionId],
    queryFn: () =>
      fetch(`/api/connections/${selectedConnectionId}/schema`).then((r) => r.json()).then((d) => d.data as SchemaTable[]),
    enabled: !!selectedConnectionId,
  });

  const toggleTable = (name: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="p-2" style={{ borderBottom: "1px solid var(--bg-border)" }}>
        <div className="relative">
          <select
            value={selectedConnectionId ?? ""}
            onChange={(e) => { setSelectedConnectionId(e.target.value || null); setExpandedTables(new Set()); }}
            className="w-full px-2 py-1.5 text-xs outline-none"
            style={{ ...inputStyle, appearance: "none", WebkitAppearance: "none", paddingRight: "28px" }}
          >
            <option value="">Select connection…</option>
            {connections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <svg className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2" style={{ display: "block", color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {!selectedConnectionId && (
          <p className="px-3 py-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>Select a connection</p>
        )}
        {schemaData?.map((table) => (
          <div key={table.name}>
            <button
              onClick={() => toggleTable(table.name)}
              className="flex w-full items-center gap-1 px-3 py-1 text-left text-xs transition-colors"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "")}
            >
              <span style={{ color: "var(--text-muted)" }}>{expandedTables.has(table.name) ? "▾" : "▸"}</span>
              <span
                className="flex-1 truncate font-mono"
                style={{ color: "var(--text-primary)" }}
                onClick={(e) => { e.stopPropagation(); onInsertTable(table.name); }}
              >
                {table.name}
              </span>
              <span style={{ color: "var(--text-muted)" }}>{table.columns.length}</span>
            </button>
            {expandedTables.has(table.name) && (
              <div className="pl-6">
                {table.columns.map((col) => (
                  <div key={col.name} className="flex items-center justify-between px-2 py-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <span className="font-mono">{col.name}</span>
                    <span className="px-1 text-[10px]" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", borderRadius: "2px", border: "1px solid var(--bg-border)" }}>
                      {col.dataType}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Save Query Modal
// ---------------------------------------------------------------------------

function SaveQueryModal({ onSave, onClose }: { onSave: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }}>
      <div className="w-80 p-4 shadow-lg" style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: "2px" }}>
        <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Save Query</h3>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onSave(name.trim()); if (e.key === "Escape") onClose(); }}
          placeholder="Query name…"
          className="mb-3 w-full px-3 py-2 text-sm outline-none"
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--bg-border)")}
        />
        <div className="flex justify-end gap-2">
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
            onClick={() => name.trim() && onSave(name.trim())}
            disabled={!name.trim()}
            className="px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50"
            style={{ background: "var(--accent)", borderRadius: "2px" }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main SQL Lab Page
// ---------------------------------------------------------------------------

export default function SqlLabPage() {
  const {
    tabs, activeTabId, addTab, removeTab, setActiveTab, renameTab,
    updateTabSql, setTabConnection, setTabResults, setTabStatus,
  } = useSqlLabStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const [schemaBrowserOpen, setSchemaBrowserOpen] = useState(true);
  const [bottomTab, setBottomTab] = useState<"results" | "history" | "saved">("results");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState("");

  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(224);
  const [bottomPanelHeight, setBottomPanelHeight] = useState<number>(224);

  const LEFT_PANEL_MIN = 140, LEFT_PANEL_MAX = 450;
  const BOTTOM_PANEL_MIN = 100, BOTTOM_PANEL_MAX = 550;

  // Read persisted sizes after mount to avoid SSR/client hydration mismatch
  useEffect(() => {
    const w = localStorage.getItem("sqllab:leftPanelWidth");
    if (w) setLeftPanelWidth(Number(w));
    const h = localStorage.getItem("sqllab:bottomPanelHeight");
    if (h) setBottomPanelHeight(Number(h));
  }, []);

  useEffect(() => { localStorage.setItem("sqllab:leftPanelWidth", String(leftPanelWidth)); }, [leftPanelWidth]);
  useEffect(() => { localStorage.setItem("sqllab:bottomPanelHeight", String(bottomPanelHeight)); }, [bottomPanelHeight]);

  const { data: connectionsData } = useQuery({
    queryKey: ["connections"],
    queryFn: () => fetch("/api/connections").then((r) => r.json()).then((d) => (d.data ?? []) as Connection[]),
  });
  const connections: Connection[] = connectionsData ?? [];

  const { data: savedQueriesData, refetch: refetchSaved } = useQuery({
    queryKey: ["saved-queries"],
    queryFn: () => fetch("/api/saved-queries").then((r) => r.json()).then((d) => (d.data ?? []) as SavedQuery[]),
  });

  const deleteSavedMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/saved-queries/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => refetchSaved(),
  });

  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ["query-history"],
    queryFn: () => fetch("/api/query-history?page=1&pageSize=50").then((r) => r.json()).then((d) => (d.data?.data ?? []) as HistoryItem[]),
  });

  const runMutation = useMutation({
    mutationFn: async ({ connectionId, sql }: { connectionId: string; sql: string }) => {
      const res = await fetch("/api/query", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, sql }),
      });
      return res.json() as Promise<{ data: QueryResult | null; error: string | null }>;
    },
    onSuccess: (response) => {
      if (!activeTabId) return;
      if (response.data) { setTabResults(activeTabId, response.data); setBottomTab("results"); }
      else {
        const msg = response.error ?? "Query failed";
        setTabStatus(activeTabId, "error", msg);
        setBottomTab("results");
        toast.error(msg);
      }
      refetchHistory();
    },
    onError: () => { if (activeTabId) setTabStatus(activeTabId, "error", "Network error"); toast.error("Network error"); },
  });

  const handleRunQuery = useCallback(() => {
    if (!activeTab?.connectionId || !activeTab.sql.trim() || !activeTabId) return;
    setTabStatus(activeTabId, "running");
    runMutation.mutate({ connectionId: activeTab.connectionId, sql: activeTab.sql });
  }, [activeTab, activeTabId, runMutation, setTabStatus]);

  const handleFormatSql = useCallback(() => {
    if (!activeTab || !activeTabId) return;
    try { updateTabSql(activeTabId, formatSql(activeTab.sql, { language: "sql" })); } catch { /* ignore */ }
  }, [activeTab, activeTabId, updateTabSql]);

  const saveMutation = useMutation({
    mutationFn: async ({ name, sql, connectionId }: { name: string; sql: string; connectionId: string }) => {
      const res = await fetch("/api/saved-queries", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sql, connectionId }),
      });
      return res.json();
    },
    onSuccess: () => { toast.success("Query saved"); refetchSaved(); setBottomTab("saved"); },
    onError: () => toast.error("Failed to save query"),
  });

  const handleSaveQuery = useCallback(
    (name: string) => {
      if (!activeTab?.connectionId) return;
      saveMutation.mutate({ name, sql: activeTab.sql, connectionId: activeTab.connectionId });
      setShowSaveModal(false);
    },
    [activeTab, saveMutation],
  );

  const handleTabDoubleClick = (tabId: string, currentName: string) => {
    setEditingTabId(tabId); setEditingTabName(currentName);
  };
  const commitRename = () => {
    if (editingTabId && editingTabName.trim()) renameTab(editingTabId, editingTabName.trim());
    setEditingTabId(null);
  };

  const handleInsertTable = useCallback(
    (tableName: string) => {
      if (!activeTabId) return;
      const current = activeTab?.sql ?? "";
      const newSql = current ? `${current}\nSELECT * FROM ${tableName} LIMIT 100` : `SELECT * FROM ${tableName} LIMIT 100`;
      updateTabSql(activeTabId, newSql);
    },
    [activeTab, activeTabId, updateTabSql],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (activeTab?.connectionId && activeTab.sql.trim()) setShowSaveModal(true);
      }
    },
    [activeTab],
  );

  const isRunDisabled = !activeTab?.connectionId || !activeTab?.sql?.trim() || activeTab.status === "running";

  const handleLeftResizeStart = useCallback((e: React.MouseEvent) => {
    const startX = e.clientX, startWidth = leftPanelWidth;
    const onMouseMove = (ev: MouseEvent) => {
      const next = Math.min(LEFT_PANEL_MAX, Math.max(LEFT_PANEL_MIN, startWidth + ev.clientX - startX));
      setLeftPanelWidth(next);
    };
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [leftPanelWidth, LEFT_PANEL_MIN, LEFT_PANEL_MAX]);

  const handleBottomResizeStart = useCallback((e: React.MouseEvent) => {
    const startY = e.clientY, startHeight = bottomPanelHeight;
    const onMouseMove = (ev: MouseEvent) => {
      const next = Math.min(BOTTOM_PANEL_MAX, Math.max(BOTTOM_PANEL_MIN, startHeight + startY - ev.clientY));
      setBottomPanelHeight(next);
    };
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [bottomPanelHeight, BOTTOM_PANEL_MIN, BOTTOM_PANEL_MAX]);

  return (
    <div
      className="flex h-screen flex-col"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
      onKeyDown={handleKeyDown}
    >
      {/* Tab bar */}
      <div
        className="flex items-center gap-0 overflow-x-auto"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}
      >
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className="group flex min-w-0 cursor-pointer items-center gap-1 px-3 py-2 text-xs transition-colors"
            style={{
              borderRight: "1px solid var(--bg-border)",
              borderBottom: tab.id === activeTabId ? "2px solid var(--accent)" : "2px solid transparent",
              background: tab.id === activeTabId ? "var(--bg-elevated)" : "transparent",
              color: tab.id === activeTabId ? "var(--text-primary)" : "var(--text-muted)",
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {editingTabId === tab.id ? (
              <input
                autoFocus value={editingTabName}
                onChange={(e) => setEditingTabName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditingTabId(null); }}
                className="w-24 bg-transparent outline-none"
                style={{ color: "var(--text-primary)" }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="max-w-24 truncate" onDoubleClick={(e) => { e.stopPropagation(); handleTabDoubleClick(tab.id, tab.name); }}>
                {tab.name}
              </span>
            )}
            {tab.status === "running" && (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--accent)" }} />
            )}
            {tabs.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}
                className="ml-0.5 hidden px-0.5 group-hover:block transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addTab}
          className="px-3 py-2 text-xs transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
          title="New tab"
        >
          +
        </button>
      </div>

      {/* Main body */}
      <div className="flex min-h-0 flex-1">
        {/* Schema browser */}
        {schemaBrowserOpen && (
          <>
          <div
            className="flex shrink-0 flex-col"
            style={{ width: `${leftPanelWidth}px`, background: "var(--bg-surface)" }}
          >
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{ borderBottom: "1px solid var(--bg-border)" }}
            >
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Schema</span>
              <button
                onClick={() => setSchemaBrowserOpen(false)}
                className="text-sm transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
              >
                ‹
              </button>
            </div>
            <SchemaBrowser connections={connections} onInsertTable={handleInsertTable} />
          </div>
          <ResizeHandle direction="horizontal" onResizeStart={handleLeftResizeStart} />
          </>
        )}

        {/* Editor + results */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Toolbar */}
          <div
            className="flex items-center gap-2 px-3 py-1.5"
            style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}
          >
            {!schemaBrowserOpen && (
              <button
                onClick={() => setSchemaBrowserOpen(true)}
                className="px-2 py-1 text-xs transition-colors"
                style={{ ...ghostBtnStyle }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "")}
              >
                › Schema
              </button>
            )}

            <div className="relative">
              <select
                value={activeTab?.connectionId ?? ""}
                onChange={(e) => { if (activeTabId) setTabConnection(activeTabId, e.target.value); }}
                className="px-2 py-1 text-xs outline-none"
                style={{ ...inputStyle, appearance: "none", WebkitAppearance: "none", paddingRight: "28px" }}
              >
                <option value="">Select connection…</option>
                {connections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2" style={{ display: "block", color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            <div className="flex-1" />

            <button
              onClick={handleFormatSql}
              className="px-2 py-1 text-xs transition-colors"
              style={{ ...ghostBtnStyle }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "")}
              title="Format SQL"
            >
              Format
            </button>

            <button
              onClick={() => { if (activeTab?.connectionId && activeTab.sql.trim()) setShowSaveModal(true); }}
              disabled={!activeTab?.connectionId || !activeTab?.sql?.trim()}
              className="px-2 py-1 text-xs transition-colors disabled:opacity-40"
              style={{ ...ghostBtnStyle }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "")}
              title="Save query (Ctrl+S)"
            >
              Save
            </button>

            <button
              onClick={handleRunQuery}
              disabled={isRunDisabled}
              className="px-3 py-1 text-xs font-medium text-white transition-colors disabled:opacity-40"
              style={{ background: "var(--accent)", borderRadius: "2px" }}
              onMouseEnter={(e) => { if (!isRunDisabled) (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-deep)"; }}
              onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.background = "var(--accent)"}
              title="Run query (Ctrl+Enter)"
            >
              {activeTab?.status === "running" ? "Running…" : "Run"}
            </button>
          </div>

          {/* Editor */}
          <div className="flex-1" style={{ minHeight: 0 }}>
            <SqlEditor
              value={activeTab?.sql ?? ""}
              onChange={(sql) => { if (activeTabId) updateTabSql(activeTabId, sql); }}
              onRun={handleRunQuery}
              className="h-full"
            />
          </div>

          {/* Bottom panel */}
          <ResizeHandle direction="vertical" onResizeStart={handleBottomResizeStart} />
          <div className="flex shrink-0 flex-col" style={{ height: `${bottomPanelHeight}px` }}>
            {/* Panel tabs */}
            <div
              className="flex items-center"
              style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}
            >
              {(["results", "history", "saved"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setBottomTab(t)}
                  className="px-4 py-1.5 text-xs capitalize transition-colors"
                  style={{
                    borderBottom: bottomTab === t ? `2px solid var(--accent)` : "2px solid transparent",
                    color: bottomTab === t ? "var(--text-primary)" : "var(--text-muted)",
                    fontWeight: bottomTab === t ? 600 : 400,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Results */}
            {bottomTab === "results" && (
              <div className="min-h-0 flex-1 overflow-auto" style={{ background: "var(--bg-surface)" }}>
                {activeTab?.status === "running" && (
                  <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
                    Running query…
                  </div>
                )}
                {activeTab?.status === "error" && (
                  <div className="p-3 text-xs font-mono" style={{ color: "var(--error)" }}>
                    {activeTab.error ?? "Query failed"}
                  </div>
                )}
                {activeTab?.results && activeTab.status !== "running" && (
                  <ResultsTable result={activeTab.results} />
                )}
                {!activeTab?.results && activeTab?.status === "idle" && (
                  <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
                    Run a query to see results
                  </div>
                )}
              </div>
            )}

            {/* Saved queries */}
            {bottomTab === "saved" && (
              <div className="min-h-0 flex-1 overflow-auto" style={{ background: "var(--bg-surface)" }}>
                {(savedQueriesData ?? []).length === 0 && (
                  <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
                    No saved queries — use Save (Ctrl+S) to save the current query
                  </div>
                )}
                {(savedQueriesData ?? []).map((item) => (
                  <div
                    key={item.id}
                    className="group flex w-full items-start gap-2 px-3 py-2"
                    style={{ borderBottom: "1px solid var(--bg-border)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "")}
                  >
                    <button
                      className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
                      onClick={() => {
                        if (activeTabId) {
                          updateTabSql(activeTabId, item.sql);
                          if (item.connectionId) setTabConnection(activeTabId, item.connectionId);
                        }
                      }}
                    >
                      <span className="truncate text-xs font-medium" style={{ color: "var(--text-primary)" }}>{item.name}</span>
                      <code className="max-w-full truncate text-xs" style={{ color: "var(--text-secondary)" }}>{item.sql}</code>
                    </button>
                    <button
                      onClick={() => deleteSavedMutation.mutate(item.id)}
                      disabled={deleteSavedMutation.isPending}
                      className="mt-0.5 shrink-0 px-1 py-0.5 text-xs opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-30"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--error)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* History */}
            {bottomTab === "history" && (
              <div className="min-h-0 flex-1 overflow-auto" style={{ background: "var(--bg-surface)" }}>
                {(historyData ?? []).length === 0 && (
                  <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
                    No query history
                  </div>
                )}
                {(historyData ?? []).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { if (activeTabId) updateTabSql(activeTabId, item.sql); }}
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors"
                    style={{ borderBottom: "1px solid var(--bg-border)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "")}
                  >
                    <div className="flex w-full items-center gap-2">
                      <span
                        className="text-[10px] font-semibold uppercase"
                        style={{ color: item.status === "success" ? "var(--success)" : "var(--error)" }}
                      >
                        {item.status}
                      </span>
                      {item.rowCount != null && (
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          {item.rowCount.toLocaleString()} rows
                        </span>
                      )}
                      {item.durationMs != null && (
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{item.durationMs}ms</span>
                      )}
                      <span className="ml-auto text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <code className="max-w-full truncate text-xs" style={{ color: "var(--text-secondary)" }}>{item.sql}</code>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showSaveModal && <SaveQueryModal onSave={handleSaveQuery} onClose={() => setShowSaveModal(false)} />}
    </div>
  );
}
