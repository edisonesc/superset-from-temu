"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format as formatSql } from "sql-formatter";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useSqlLabStore } from "@/stores/sqllab-store";
import SqlEditor from "@/components/sqllab/SqlEditor";
import type { QueryResult } from "@/lib/query-runner";
import type { SchemaTable } from "@/app/api/connections/[id]/schema/route";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Connection = {
  id: string;
  name: string;
  dialect: string;
};

type HistoryItem = {
  id: string;
  sql: string;
  status: "success" | "error";
  rowCount: number | null;
  durationMs: number | null;
  createdAt: string;
};

type SavedQuery = {
  id: string;
  name: string;
  sql: string;
  connectionId: string;
  createdAt: string;
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
        <span className="text-[10px] font-normal text-zinc-500">{col.type}</span>
      </div>
    ),
    cell: ({ getValue }) => {
      const v = getValue();
      if (v === null || v === undefined) return <span className="text-zinc-600 italic">NULL</span>;
      return String(v);
    },
  }));

  const table = useReactTable({
    data: result.rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const exportCsv = useCallback(() => {
    const headers = result.columns.map((c) => c.name).join(",");
    const rows = result.rows.map((row) =>
      result.columns
        .map((c) => {
          const v = row[c.name];
          if (v === null || v === undefined) return "";
          const s = String(v);
          return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(","),
    );
    const blob = new Blob([[headers, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "query_results.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-1.5">
        <span className="text-xs text-zinc-400">
          {result.rowCount.toLocaleString()} rows · {result.durationMs}ms
        </span>
        <button
          onClick={exportCsv}
          className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          Export CSV
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-zinc-900">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer border-b border-zinc-800 px-3 py-2 text-left font-medium text-zinc-300 hover:bg-zinc-800"
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === "asc" && " ↑"}
                      {header.column.getIsSorted() === "desc" && " ↓"}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-zinc-900/50">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="border-b border-zinc-800/50 px-3 py-1.5 font-mono text-zinc-300"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {result.rows.length === 0 && (
          <div className="flex h-24 items-center justify-center text-sm text-zinc-500">
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

function SchemaBrowser({
  connections,
  onInsertTable,
}: {
  connections: Connection[];
  onInsertTable: (tableName: string) => void;
}) {
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const { data: schemaData } = useQuery({
    queryKey: ["schema", selectedConnectionId],
    queryFn: () =>
      fetch(`/api/connections/${selectedConnectionId}/schema`)
        .then((r) => r.json())
        .then((d) => d.data as SchemaTable[]),
    enabled: !!selectedConnectionId,
  });

  const toggleTable = (name: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 p-2">
        <select
          value={selectedConnectionId ?? ""}
          onChange={(e) => {
            setSelectedConnectionId(e.target.value || null);
            setExpandedTables(new Set());
          }}
          className="w-full rounded bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 focus:outline-none"
        >
          <option value="">Select connection…</option>
          {connections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {!selectedConnectionId && (
          <p className="px-3 py-4 text-center text-xs text-zinc-600">Select a connection</p>
        )}

        {schemaData?.map((table) => (
          <div key={table.name}>
            <button
              onClick={() => toggleTable(table.name)}
              className="flex w-full items-center gap-1 px-3 py-1 text-left text-xs text-zinc-300 hover:bg-zinc-800"
            >
              <span className="text-zinc-600">{expandedTables.has(table.name) ? "▾" : "▸"}</span>
              <span
                className="flex-1 truncate font-mono hover:text-blue-400"
                onClick={(e) => {
                  e.stopPropagation();
                  onInsertTable(table.name);
                }}
              >
                {table.name}
              </span>
              <span className="text-zinc-600">{table.columns.length}</span>
            </button>

            {expandedTables.has(table.name) && (
              <div className="pl-6">
                {table.columns.map((col) => (
                  <div
                    key={col.name}
                    className="flex items-center justify-between px-2 py-0.5 text-xs text-zinc-500"
                  >
                    <span className="font-mono">{col.name}</span>
                    <span className="rounded bg-zinc-800 px-1 text-[10px] text-zinc-600">
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

function SaveQueryModal({
  onSave,
  onClose,
}: {
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-80 rounded-lg border border-zinc-700 bg-zinc-900 p-4">
        <h3 className="mb-3 text-sm font-medium text-zinc-100">Save Query</h3>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onSave(name.trim());
            if (e.key === "Escape") onClose();
          }}
          placeholder="Query name…"
          className="mb-3 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onSave(name.trim())}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={!name.trim()}
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
    tabs,
    activeTabId,
    addTab,
    removeTab,
    setActiveTab,
    renameTab,
    updateTabSql,
    setTabConnection,
    setTabResults,
    setTabStatus,
  } = useSqlLabStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const [schemaBrowserOpen, setSchemaBrowserOpen] = useState(true);
  const [bottomTab, setBottomTab] = useState<"results" | "history" | "saved">("results");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState("");


  // ── Connections ────────────────────────────────────────────────────────────
  const { data: connectionsData } = useQuery({
    queryKey: ["connections"],
    queryFn: () =>
      fetch("/api/connections")
        .then((r) => r.json())
        .then((d) => (d.data ?? []) as Connection[]),
  });
  const connections: Connection[] = connectionsData ?? [];

  // ── Saved queries ──────────────────────────────────────────────────────────
  const { data: savedQueriesData, refetch: refetchSaved } = useQuery({
    queryKey: ["saved-queries"],
    queryFn: () =>
      fetch("/api/saved-queries")
        .then((r) => r.json())
        .then((d) => (d.data ?? []) as SavedQuery[]),
  });

  const deleteSavedMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/saved-queries/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => refetchSaved(),
  });

  // ── Query history ──────────────────────────────────────────────────────────
  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ["query-history"],
    queryFn: () =>
      fetch("/api/query-history?page=1&pageSize=50")
        .then((r) => r.json())
        .then((d) => (d.data?.data ?? []) as HistoryItem[]),
  });

  // ── Run query ──────────────────────────────────────────────────────────────
  const runMutation = useMutation({
    mutationFn: async ({ connectionId, sql }: { connectionId: string; sql: string }) => {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, sql }),
      });
      return res.json() as Promise<{ data: QueryResult | null; error: string | null }>;
    },
    onSuccess: (response, { }) => {
      if (!activeTabId) return;
      if (response.data) {
        setTabResults(activeTabId, response.data);
        setBottomTab("results");
      } else {
        setTabStatus(activeTabId, "error", response.error ?? "Query failed");
        setBottomTab("results");
      }
      refetchHistory();
    },
    onError: () => {
      if (activeTabId) setTabStatus(activeTabId, "error", "Network error");
    },
  });

  const handleRunQuery = useCallback(() => {
    if (!activeTab?.connectionId || !activeTab.sql.trim() || !activeTabId) return;
    setTabStatus(activeTabId, "running");
    runMutation.mutate({ connectionId: activeTab.connectionId, sql: activeTab.sql });
  }, [activeTab, activeTabId, runMutation, setTabStatus]);

  // ── Format SQL ─────────────────────────────────────────────────────────────
  const handleFormatSql = useCallback(() => {
    if (!activeTab || !activeTabId) return;
    try {
      const formatted = formatSql(activeTab.sql, { language: "sql" });
      updateTabSql(activeTabId, formatted);
    } catch {
      // sql-formatter may throw on invalid SQL — ignore
    }
  }, [activeTab, activeTabId, updateTabSql]);

  // ── Save query ─────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async ({ name, sql, connectionId }: { name: string; sql: string; connectionId: string }) => {
      const res = await fetch("/api/saved-queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sql, connectionId }),
      });
      return res.json();
    },
    onSuccess: () => {
      refetchSaved();
      setBottomTab("saved");
    },
  });

  const handleSaveQuery = useCallback(
    (name: string) => {
      if (!activeTab?.connectionId) return;
      saveMutation.mutate({ name, sql: activeTab.sql, connectionId: activeTab.connectionId });
      setShowSaveModal(false);
    },
    [activeTab, saveMutation],
  );

  // ── Tab rename ─────────────────────────────────────────────────────────────
  const handleTabDoubleClick = (tabId: string, currentName: string) => {
    setEditingTabId(tabId);
    setEditingTabName(currentName);
  };

  const commitRename = () => {
    if (editingTabId && editingTabName.trim()) {
      renameTab(editingTabId, editingTabName.trim());
    }
    setEditingTabId(null);
  };

  // ── Insert table name into editor ──────────────────────────────────────────
  const handleInsertTable = useCallback(
    (tableName: string) => {
      if (!activeTabId) return;
      const current = activeTab?.sql ?? "";
      const newSql = current ? `${current}\nSELECT * FROM ${tableName} LIMIT 100` : `SELECT * FROM ${tableName} LIMIT 100`;
      updateTabSql(activeTabId, newSql);
    },
    [activeTab, activeTabId, updateTabSql],
  );

  // ── Keyboard shortcut: Ctrl+S to save ─────────────────────────────────────
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

  return (
    <div
      className="flex h-screen flex-col bg-zinc-950 text-zinc-100"
      onKeyDown={handleKeyDown}
    >
      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0 overflow-x-auto border-b border-zinc-800 bg-zinc-900">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`group flex min-w-0 cursor-pointer items-center gap-1 border-r border-zinc-800 px-3 py-2 text-xs ${
              tab.id === activeTabId
                ? "bg-zinc-950 text-zinc-100"
                : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {editingTabId === tab.id ? (
              <input
                autoFocus
                value={editingTabName}
                onChange={(e) => setEditingTabName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setEditingTabId(null);
                }}
                className="w-24 bg-transparent outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="max-w-24 truncate"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleTabDoubleClick(tab.id, tab.name);
                }}
              >
                {tab.name}
              </span>
            )}
            {tab.status === "running" && (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
            )}
            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeTab(tab.id);
                }}
                className="ml-0.5 hidden rounded px-0.5 text-zinc-600 hover:text-zinc-300 group-hover:block"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addTab}
          className="px-3 py-2 text-xs text-zinc-600 hover:text-zinc-300"
          title="New tab"
        >
          +
        </button>
      </div>

      {/* ── Main body ────────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">
        {/* Schema browser */}
        {schemaBrowserOpen && (
          <div className="flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
              <span className="text-xs font-medium text-zinc-400">Schema</span>
              <button
                onClick={() => setSchemaBrowserOpen(false)}
                className="text-zinc-600 hover:text-zinc-300"
              >
                ‹
              </button>
            </div>
            <SchemaBrowser connections={connections} onInsertTable={handleInsertTable} />
          </div>
        )}

        {/* Editor + results column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Toolbar */}
          <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-1.5">
            {!schemaBrowserOpen && (
              <button
                onClick={() => setSchemaBrowserOpen(true)}
                className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              >
                › Schema
              </button>
            )}

            <select
              value={activeTab?.connectionId ?? ""}
              onChange={(e) => {
                if (activeTabId) setTabConnection(activeTabId, e.target.value);
              }}
              className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 focus:outline-none"
            >
              <option value="">Select connection…</option>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <div className="flex-1" />

            <button
              onClick={handleFormatSql}
              className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              title="Format SQL"
            >
              Format
            </button>

            <button
              onClick={() => {
                if (activeTab?.connectionId && activeTab.sql.trim()) setShowSaveModal(true);
              }}
              disabled={!activeTab?.connectionId || !activeTab?.sql?.trim()}
              className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-40"
              title="Save query (Ctrl+S)"
            >
              Save
            </button>

            <button
              onClick={handleRunQuery}
              disabled={isRunDisabled}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40"
              title="Run query (Ctrl+Enter)"
            >
              {activeTab?.status === "running" ? "Running…" : "Run"}
            </button>
          </div>

          {/* Editor */}
          <div className="flex-1" style={{ minHeight: 0 }}>
            <SqlEditor
              value={activeTab?.sql ?? ""}
              onChange={(sql) => {
                if (activeTabId) updateTabSql(activeTabId, sql);
              }}
              onRun={handleRunQuery}
              className="h-full"
            />
          </div>

          {/* Bottom panel */}
          <div className="flex h-56 shrink-0 flex-col border-t border-zinc-800">
            {/* Panel tabs */}
            <div className="flex items-center border-b border-zinc-800 bg-zinc-900">
              {(["results", "history", "saved"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setBottomTab(t)}
                  className={`px-4 py-1.5 text-xs capitalize ${
                    bottomTab === t
                      ? "border-b-2 border-blue-500 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Results panel */}
            {bottomTab === "results" && (
              <div className="min-h-0 flex-1 overflow-auto">
                {activeTab?.status === "running" && (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                    Running query…
                  </div>
                )}
                {activeTab?.status === "error" && (
                  <div className="p-3 text-xs text-red-400">
                    {activeTab.error ?? "Query failed"}
                  </div>
                )}
                {activeTab?.results && activeTab.status !== "running" && (
                  <ResultsTable result={activeTab.results} />
                )}
                {!activeTab?.results && activeTab?.status === "idle" && (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-600">
                    Run a query to see results
                  </div>
                )}
              </div>
            )}

            {/* Saved queries panel */}
            {bottomTab === "saved" && (
              <div className="min-h-0 flex-1 overflow-auto">
                {(savedQueriesData ?? []).length === 0 && (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-600">
                    No saved queries — use Save (Ctrl+S) to save the current query
                  </div>
                )}
                {(savedQueriesData ?? []).map((item) => (
                  <div
                    key={item.id}
                    className="flex w-full items-start gap-2 border-b border-zinc-800/50 px-3 py-2 hover:bg-zinc-900 group"
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
                      <span className="truncate text-xs font-medium text-zinc-200">{item.name}</span>
                      <code className="max-w-full truncate text-xs text-zinc-500">{item.sql}</code>
                    </button>
                    <button
                      onClick={() => deleteSavedMutation.mutate(item.id)}
                      disabled={deleteSavedMutation.isPending}
                      className="mt-0.5 shrink-0 rounded px-1 py-0.5 text-xs text-zinc-700 opacity-0 hover:text-red-400 group-hover:opacity-100 transition-opacity disabled:opacity-30"
                      title="Delete saved query"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* History panel */}
            {bottomTab === "history" && (
              <div className="min-h-0 flex-1 overflow-auto">
                {(historyData ?? []).length === 0 && (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-600">
                    No query history
                  </div>
                )}
                {(historyData ?? []).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (activeTabId) updateTabSql(activeTabId, item.sql);
                    }}
                    className="flex w-full flex-col items-start gap-0.5 border-b border-zinc-800/50 px-3 py-2 text-left hover:bg-zinc-900"
                  >
                    <div className="flex w-full items-center gap-2">
                      <span
                        className={`text-[10px] font-medium uppercase ${
                          item.status === "success" ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {item.status}
                      </span>
                      {item.rowCount != null && (
                        <span className="text-[10px] text-zinc-600">
                          {item.rowCount.toLocaleString()} rows
                        </span>
                      )}
                      {item.durationMs != null && (
                        <span className="text-[10px] text-zinc-600">{item.durationMs}ms</span>
                      )}
                      <span className="ml-auto text-[10px] text-zinc-700">
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <code className="max-w-full truncate text-xs text-zinc-400">{item.sql}</code>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save modal */}
      {showSaveModal && (
        <SaveQueryModal onSave={handleSaveQuery} onClose={() => setShowSaveModal(false)} />
      )}
    </div>
  );
}
