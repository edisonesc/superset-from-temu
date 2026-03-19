"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
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

type Connection = {
  id: string;
  name: string;
  dialect: string;
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

  const { data: session } = useSession();
  const canEdit = ["admin", "alpha"].includes(session?.user?.role ?? "");

  const [activeTab, setActiveTab] = useState<"overview" | "columns">("overview");
  const [editName, setEditName] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState<string | null>(null);
  const [editConnectionId, setEditConnectionId] = useState<string | null>(null);
  const [localColumns, setLocalColumns] = useState<ColumnMeta[] | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: dataset, isLoading, isError } = useQuery<Dataset>({
    queryKey: ["dataset", id],
    queryFn: () => fetchJson<Dataset>(`/api/datasets/${id}`),
  });

  useEffect(() => {
    if (dataset) {
      setEditName(dataset.name);
      setEditDesc(dataset.description ?? "");
      setEditConnectionId(dataset.connectionId);
    }
  }, [dataset]);

  const { data: columns = [] } = useQuery<ColumnMeta[]>({
    queryKey: ["dataset-columns", id],
    queryFn: () => fetchJson<ColumnMeta[]>(`/api/datasets/${id}/columns`),
    enabled: activeTab === "columns",
  });

  useEffect(() => {
    if (columns.length > 0) setLocalColumns(columns);
  }, [columns]);

  const { data: connections = [] } = useQuery<Connection[]>({
    queryKey: ["connections"],
    queryFn: () => fetchJson<Connection[]>("/api/connections"),
    enabled: canEdit,
  });

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
    mutationFn: () => {
      const payload: Record<string, unknown> = { name: editName, description: editDesc };
      if (editConnectionId && editConnectionId !== dataset?.connectionId) {
        payload.connectionId = editConnectionId;
      }
      return fetchJson(`/api/datasets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      const connectionChanged = editConnectionId !== dataset?.connectionId;
      toast.success("Dataset saved");
      queryClient.invalidateQueries({ queryKey: ["dataset", id] });
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      if (connectionChanged) {
        // Clear cached column metadata so the user re-syncs with the new connection
        queryClient.invalidateQueries({ queryKey: ["dataset-columns", id] });
        setLocalColumns(null);
        toast.info("Connection changed — sync columns to refresh metadata");
      }
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

  const inputStyle = {
    background: "var(--bg-elevated)",
    border: "1px solid var(--bg-border)",
    color: "var(--text-primary)",
    borderRadius: "2px",
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 animate-pulse" style={{ background: "var(--bg-border)", borderRadius: "2px" }} />
        <div className="h-4 w-96 animate-pulse" style={{ background: "var(--bg-border)", borderRadius: "2px" }} />
        <div className="h-64 animate-pulse" style={{ background: "var(--bg-border)", borderRadius: "2px" }} />
      </div>
    );
  }

  if (isError || !dataset) {
    return (
      <div className="p-6">
        <p className="text-sm" style={{ color: "var(--error)" }}>Failed to load dataset.</p>
        <Link href="/datasets" className="text-sm mt-2 inline-block transition-colors" style={{ color: "var(--accent)" }}>
          Back to Datasets
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-base)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}
      >
        <div className="flex items-center gap-3">
          <Link href="/datasets" className="transition-colors" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{dataset.name}</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {dataset.sqlDefinition ? "Virtual dataset" : "Physical table"} ·{" "}
              {dataset.connectionName ?? "unknown connection"}
            </p>
          </div>
        </div>
        <button
          onClick={confirmDelete}
          disabled={deleteDataset.isPending}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors disabled:opacity-50"
          style={{
            border: "1px solid var(--bg-border)",
            color: "var(--text-muted)",
            borderRadius: "2px",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--error)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(220,38,38,0.3)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--bg-border)";
          }}
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-6" style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}>
        {(["overview", "columns"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2.5 text-sm font-medium transition-colors capitalize"
            style={{
              borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
              color: activeTab === tab ? "var(--accent)" : "var(--text-muted)",
            }}
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
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Name</label>
              <input
                value={editName ?? dataset.name}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full text-sm px-3 py-2 outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--bg-border)")}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Description</label>
              <textarea
                value={editDesc ?? (dataset.description ?? "")}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                placeholder="Optional description…"
                className="w-full text-sm px-3 py-2 outline-none transition-colors resize-none"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--bg-border)")}
              />
            </div>

            {/* Connection */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Connection</label>
              {canEdit ? (
                <select
                  value={editConnectionId ?? dataset.connectionId}
                  onChange={(e) => setEditConnectionId(e.target.value)}
                  className="w-full text-sm px-3 py-2 outline-none transition-colors"
                  style={{ ...inputStyle, cursor: "pointer" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--bg-border)")}
                >
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.dialect})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>{dataset.connectionName ?? "—"}</span>
                  {dataset.dialect && (
                    <span
                      className="inline-flex items-center px-2 py-0.5 text-xs font-medium"
                      style={{
                        borderRadius: "2px",
                        background: dataset.dialect === "mysql" ? "rgba(234,88,12,0.1)" : "rgba(32,167,201,0.1)",
                        color: dataset.dialect === "mysql" ? "#EA580C" : "var(--accent)",
                        border: `1px solid ${dataset.dialect === "mysql" ? "rgba(234,88,12,0.2)" : "rgba(32,167,201,0.2)"}`,
                      }}
                    >
                      {dataset.dialect}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Table or SQL */}
            {dataset.tableName && !dataset.sqlDefinition && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Table</label>
                <code className="text-sm font-mono" style={{ color: "var(--text-primary)" }}>{dataset.tableName}</code>
              </div>
            )}
            {dataset.sqlDefinition && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>SQL Definition</label>
                <pre
                  className="text-xs font-mono overflow-auto max-h-48 p-3"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--bg-border)",
                    color: "var(--text-primary)",
                    borderRadius: "2px",
                  }}
                >
                  {dataset.sqlDefinition}
                </pre>
              </div>
            )}

            {/* Charts using this dataset */}
            {chartList.length > 0 && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Charts ({chartList.length})
                </label>
                <div className="space-y-1">
                  {chartList.map((c) => (
                    <Link
                      key={c.id}
                      href={`/charts/${c.id}`}
                      className="flex items-center gap-2 text-sm transition-colors"
                      style={{ color: "var(--accent)" }}
                    >
                      <span>{c.name}</span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>({c.vizType})</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => saveMeta.mutate()}
                disabled={saveMeta.isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ background: "var(--accent)", borderRadius: "2px" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent-deep)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent)")}
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
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{displayColumns.length} columns</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncColumns}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors disabled:opacity-50"
                  style={{
                    border: "1px solid var(--bg-border)",
                    color: "var(--text-secondary)",
                    borderRadius: "2px",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--bg-border)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                  }}
                >
                  <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
                  Sync Columns
                </button>
                <button
                  onClick={() => saveColumns.mutate()}
                  disabled={saveColumns.isPending || !localColumns}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50"
                  style={{ background: "var(--accent)", borderRadius: "2px" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent-deep)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent)")}
                >
                  <Save size={12} />
                  {saveColumns.isPending ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>

            {displayColumns.length === 0 ? (
              <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                <p>No columns found. Click Sync Columns to introspect from the database.</p>
              </div>
            ) : (
              <div style={{ border: "1px solid var(--bg-border)", borderRadius: "2px", overflow: "hidden" }}>
                <table className="w-full text-sm">
                  <thead style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--bg-border)" }}>
                    <tr>
                      {["Column", "Type", "Label", "Description", "Temporal", "Filterable", "Groupable"].map((h) => (
                        <th
                          key={h}
                          className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide ${h === "Temporal" || h === "Filterable" || h === "Groupable" ? "text-center" : "text-left"}`}
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayColumns.map((col, idx) => (
                      <tr
                        key={col.name}
                        style={{ borderBottom: "1px solid var(--bg-border)", background: idx % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "var(--bg-hover)")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)")}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <code className="text-xs font-mono" style={{ color: "var(--text-primary)" }}>{col.name}</code>
                            {col.isPrimaryKey && (
                              <span
                                className="text-[10px] px-1"
                                style={{ background: "rgba(217,119,6,0.1)", color: "var(--warning)", borderRadius: "2px" }}
                              >PK</span>
                            )}
                            {col.isForeignKey && (
                              <span
                                className="text-[10px] px-1"
                                style={{ background: "rgba(32,167,201,0.1)", color: "var(--accent)", borderRadius: "2px" }}
                              >FK</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                            {col.dataType ?? col.type ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            value={col.label ?? col.name}
                            onChange={(e) => updateColumn(idx, "label", e.target.value)}
                            className="w-full text-xs px-2 py-1 outline-none transition-colors"
                            style={{
                              background: "var(--bg-elevated)",
                              border: "1px solid transparent",
                              color: "var(--text-primary)",
                              borderRadius: "2px",
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--bg-border)")}
                            onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            value={col.description ?? ""}
                            onChange={(e) => updateColumn(idx, "description", e.target.value)}
                            placeholder="Optional…"
                            className="w-full text-xs px-2 py-1 outline-none transition-colors"
                            style={{
                              background: "var(--bg-elevated)",
                              border: "1px solid transparent",
                              color: "var(--text-secondary)",
                              borderRadius: "2px",
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--bg-border)")}
                            onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                          />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={col.is_temporal ?? false}
                            onChange={(e) => updateColumn(idx, "is_temporal", e.target.checked)}
                            style={{ accentColor: "var(--accent-deep)" }}
                          />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={col.is_filterable ?? true}
                            onChange={(e) => updateColumn(idx, "is_filterable", e.target.checked)}
                            style={{ accentColor: "var(--accent-deep)" }}
                          />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={col.is_groupable ?? true}
                            onChange={(e) => updateColumn(idx, "is_groupable", e.target.checked)}
                            style={{ accentColor: "var(--accent-deep)" }}
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
