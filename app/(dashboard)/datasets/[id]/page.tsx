"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Save, RefreshCw, Trash2 } from "@/components/ui/icons";

type Dataset = {
  id: string;
  name: string;
  description: string | null;
  connectionId: string;
  connectionName: string | null;
  dialect: string | null;
  tableName: string | null;
  sqlDefinition: string | null;
  columnMetadata: unknown;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type ColumnMeta = {
  name: string;
  type?: string;
  dataType?: string;
  nullable?: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  label?: string;
  description?: string;
  is_temporal?: boolean;
  is_filterable?: boolean;
  is_groupable?: boolean;
};

type Chart = {
  id: string;
  name: string;
  vizType: string;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json.data as T;
}

/** Dataset detail page — overview (name, description, connection, SQL/table) + columns tab. */
export default function DatasetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const [activeTab, setActiveTab] = useState<"overview" | "columns">("overview");
  const [editName, setEditName] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState<string | null>(null);
  const [localColumns, setLocalColumns] = useState<ColumnMeta[] | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: dataset, isLoading, isError } = useQuery<Dataset>({
    queryKey: ["dataset", id],
    queryFn: () => fetchJson(`/api/datasets/${id}`),
    onSuccess: (d) => {
      setEditName(d.name);
      setEditDesc(d.description ?? "");
    },
  } as Parameters<typeof useQuery>[0]);

  const { data: columns = [], refetch: refetchColumns } = useQuery<ColumnMeta[]>({
    queryKey: ["dataset-columns", id],
    queryFn: () => fetchJson(`/api/datasets/${id}/columns`),
    enabled: activeTab === "columns",
    onSuccess: (cols) => setLocalColumns(cols),
  } as Parameters<typeof useQuery>[0]);

  const { data: chartList = [] } = useQuery<Chart[]>({
    queryKey: ["dataset-charts", id],
    queryFn: async () => {
      const res = await fetch(`/api/charts?datasetId=${id}&pageSize=100`);
      const json = await res.json();
      if (json.error) return [];
      return json.data?.data ?? [];
    },
  });

  const saveMeta = useMutation({
    mutationFn: () =>
      fetchJson(`/api/datasets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, description: editDesc }),
      }),
    onSuccess: () => {
      toast.success("Dataset saved");
      queryClient.invalidateQueries({ queryKey: ["dataset", id] });
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
    },
    onError: (e) => toast.error(`Save failed: ${(e as Error).message}`),
  });

  const saveColumns = useMutation({
    mutationFn: () =>
      fetchJson(`/api/datasets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnMetadata: localColumns }),
      }),
    onSuccess: () => {
      toast.success("Column metadata saved");
      queryClient.invalidateQueries({ queryKey: ["dataset-columns", id] });
    },
    onError: (e) => toast.error(`Save failed: ${(e as Error).message}`),
  });

  const deleteDataset = useMutation({
    mutationFn: () =>
      fetchJson(`/api/datasets/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Dataset deleted");
      router.push("/datasets");
    },
    onError: (e) => toast.error(`Delete failed: ${(e as Error).message}`),
  });

  async function handleSyncColumns() {
    if (!dataset) return;
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/datasets/${id}/columns`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const synced: ColumnMeta[] = (json.data as ColumnMeta[]).map((c) => {
        const existing = (localColumns ?? []).find((lc) => lc.name === c.name);
        return {
          ...c,
          label: existing?.label ?? c.name,
          description: existing?.description ?? "",
          is_temporal: existing?.is_temporal ?? false,
          is_filterable: existing?.is_filterable ?? true,
          is_groupable: existing?.is_groupable ?? true,
        };
      });
      setLocalColumns(synced);
      toast.success("Columns synced from database");
    } catch (e) {
      toast.error(`Sync failed: ${(e as Error).message}`);
    } finally {
      setIsSyncing(false);
    }
  }

  function updateColumn(idx: number, field: keyof ColumnMeta, value: unknown) {
    setLocalColumns((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  function confirmDelete() {
    if (confirm(`Delete dataset "${dataset?.name}"? This cannot be undone.`)) {
      deleteDataset.mutate();
    }
  }

  const displayColumns = localColumns ?? (columns as ColumnMeta[]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-zinc-800 animate-pulse rounded" />
        <div className="h-4 w-96 bg-zinc-800 animate-pulse rounded" />
        <div className="h-64 bg-zinc-800 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (isError || !dataset) {
    return (
      <div className="p-6">
        <p className="text-red-400">Failed to load dataset.</p>
        <Link href="/datasets" className="text-sm text-indigo-400 hover:text-indigo-300 mt-2 inline-block">
          Back to Datasets
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Link href="/datasets" className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">{dataset.name}</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {dataset.sqlDefinition ? "Virtual dataset" : "Physical table"} ·{" "}
              {dataset.connectionName ?? "unknown connection"}
            </p>
          </div>
        </div>
        <button
          onClick={confirmDelete}
          disabled={deleteDataset.isPending}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border border-zinc-800 text-zinc-600 hover:text-red-400 hover:border-red-900 transition-colors disabled:opacity-50"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-zinc-800 px-6">
        {(["overview", "columns"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "overview" ? (
          <div className="max-w-2xl space-y-5">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
              <input
                value={editName ?? dataset.name}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-3 py-2 outline-none border border-zinc-700 focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
              <textarea
                value={editDesc ?? (dataset.description ?? "")}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                placeholder="Optional description…"
                className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-3 py-2 outline-none border border-zinc-700 focus:border-indigo-500 transition-colors resize-none placeholder:text-zinc-600"
              />
            </div>

            {/* Connection */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Connection</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-300">{dataset.connectionName ?? "—"}</span>
                {dataset.dialect && (
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                      dataset.dialect === "mysql"
                        ? "bg-orange-900/40 text-orange-300"
                        : "bg-blue-900/40 text-blue-300"
                    }`}
                  >
                    {dataset.dialect}
                  </span>
                )}
              </div>
            </div>

            {/* Table or SQL */}
            {dataset.tableName && !dataset.sqlDefinition && (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Table</label>
                <code className="text-sm text-zinc-300 font-mono">{dataset.tableName}</code>
              </div>
            )}
            {dataset.sqlDefinition && (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">SQL Definition</label>
                <pre className="bg-zinc-900 border border-zinc-700 rounded p-3 text-xs text-zinc-300 font-mono overflow-auto max-h-48">
                  {dataset.sqlDefinition}
                </pre>
              </div>
            )}

            {/* Charts using this dataset */}
            {chartList.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Charts ({chartList.length})
                </label>
                <div className="space-y-1">
                  {chartList.map((c) => (
                    <Link
                      key={c.id}
                      href={`/charts/${c.id}`}
                      className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      <span>{c.name}</span>
                      <span className="text-xs text-zinc-600">({c.vizType})</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => saveMeta.mutate()}
                disabled={saveMeta.isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors"
              >
                <Save size={14} />
                {saveMeta.isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        ) : (
          /* Columns tab */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">{displayColumns.length} columns</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncColumns}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
                  Sync Columns
                </button>
                <button
                  onClick={() => saveColumns.mutate()}
                  disabled={saveColumns.isPending || !localColumns}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors"
                >
                  <Save size={12} />
                  {saveColumns.isPending ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>

            {displayColumns.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <p>No columns found. Click Sync Columns to introspect from the database.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-zinc-800">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-900 border-b border-zinc-800">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-400">Column</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-400">Type</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-400">Label</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-400">Description</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-zinc-400">Temporal</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-zinc-400">Filterable</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-zinc-400">Groupable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {displayColumns.map((col, idx) => (
                      <tr key={col.name} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <code className="text-xs font-mono text-zinc-200">{col.name}</code>
                            {col.isPrimaryKey && (
                              <span className="text-[10px] bg-amber-900/40 text-amber-300 rounded px-1">PK</span>
                            )}
                            {col.isForeignKey && (
                              <span className="text-[10px] bg-blue-900/40 text-blue-300 rounded px-1">FK</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs font-mono text-zinc-500">
                            {col.dataType ?? col.type ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            value={col.label ?? col.name}
                            onChange={(e) => updateColumn(idx, "label", e.target.value)}
                            className="w-full bg-zinc-800/60 text-zinc-200 text-xs rounded px-2 py-1 outline-none border border-transparent focus:border-zinc-600 transition-colors"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            value={col.description ?? ""}
                            onChange={(e) => updateColumn(idx, "description", e.target.value)}
                            placeholder="Optional…"
                            className="w-full bg-zinc-800/60 text-zinc-300 text-xs rounded px-2 py-1 outline-none border border-transparent focus:border-zinc-600 transition-colors placeholder:text-zinc-700"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={col.is_temporal ?? false}
                            onChange={(e) => updateColumn(idx, "is_temporal", e.target.checked)}
                            className="accent-indigo-500"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={col.is_filterable ?? true}
                            onChange={(e) => updateColumn(idx, "is_filterable", e.target.checked)}
                            className="accent-indigo-500"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={col.is_groupable ?? true}
                            onChange={(e) => updateColumn(idx, "is_groupable", e.target.checked)}
                            className="accent-indigo-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
