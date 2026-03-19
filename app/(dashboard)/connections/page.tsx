"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Database, CheckCircle, XCircle, RefreshCw, Trash2 } from "@/components/ui/icons";

type Connection = {
  id: string;
  name: string;
  dialect: string;
  host: string;
  port: number;
  databaseName: string;
  username: string;
  createdAt: string;
};

type TestStatus = { id: string; success: boolean; message: string } | null;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json.data as T;
}

export default function ConnectionsPage() {
  const queryClient = useQueryClient();
  const [testStatuses, setTestStatuses] = useState<Record<string, TestStatus>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: connections = [], isLoading, isError } = useQuery({
    queryKey: ["connections"],
    queryFn: () => fetchJson<Connection[]>("/api/connections"),
  });

  const { mutate: deleteConnection } = useMutation({
    mutationFn: (id: string) => fetchJson<{ id: string }>(`/api/connections/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["connections"] }); toast.success("Connection deleted"); },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
    onSettled: () => setDeletingId(null),
  });

  async function testConnection(id: string) {
    setTestingId(id);
    try {
      const result = await fetchJson<{ success: boolean; message: string }>(`/api/connections/${id}/test`, { method: "POST" });
      setTestStatuses((prev) => ({ ...prev, [id]: { id, ...result } }));
      if (result.success) toast.success("Connected");
      else toast.error(result.message ?? "Connection failed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Test failed";
      setTestStatuses((prev) => ({ ...prev, [id]: { id, success: false, message: msg } }));
      toast.error(msg);
    } finally {
      setTestingId(null);
    }
  }

  function confirmDelete(id: string, name: string) {
    if (confirm(`Delete connection "${name}"? This cannot be undone.`)) {
      setDeletingId(id);
      deleteConnection(id);
    }
  }

  return (
    <div className="flex h-full flex-col" style={{ background: "var(--bg-base)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}
      >
        <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Connections</h1>
        <Link
          href="/connections/new"
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white transition-colors"
          style={{ background: "var(--accent)", borderRadius: "2px" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "var(--accent-deep)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "var(--accent)")}
        >
          <Plus size={14} />
          New Connection
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse" style={{ background: "var(--bg-border)", borderRadius: "2px" }} />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm" style={{ color: "var(--error)" }}>Failed to load connections.</p>
        ) : connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 py-20 text-center">
            <span style={{ color: "var(--text-muted)" }}><Database className="h-12 w-12" /></span>
            <div>
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>No connections yet</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Add a database connection to start querying data.</p>
            </div>
            <Link href="/connections/new" className="px-4 py-2 text-sm font-medium text-white" style={{ background: "var(--accent)", borderRadius: "2px" }}>
              New Connection
            </Link>
          </div>
        ) : (
          <div style={{ border: "1px solid var(--bg-border)", borderRadius: "2px", overflow: "hidden" }}>
            <table className="w-full text-sm">
              <thead style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--bg-border)" }}>
                <tr>
                  {["Name", "Dialect", "Host", "Database", "Status", ""].map((h, i) => (
                    <th key={i} className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide ${i === 5 ? "text-right" : "text-left"}`} style={{ color: "var(--text-secondary)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {connections.map((conn, i) => {
                  const status = testStatuses[conn.id];
                  return (
                    <tr
                      key={conn.id}
                      className="transition-colors"
                      style={{ background: i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)", borderBottom: "1px solid var(--bg-border)" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "var(--bg-hover)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)")}
                    >
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>{conn.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 text-xs font-medium uppercase"
                          style={{
                            borderRadius: "2px",
                            background: conn.dialect === "mysql" ? "rgba(234,88,12,0.1)" : "rgba(32,167,201,0.1)",
                            color: conn.dialect === "mysql" ? "#EA580C" : "var(--accent)",
                            border: `1px solid ${conn.dialect === "mysql" ? "rgba(234,88,12,0.2)" : "rgba(32,167,201,0.2)"}`,
                          }}
                        >
                          {conn.dialect}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                        {conn.host}:{conn.port}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{conn.databaseName}</td>
                      <td className="px-4 py-3">
                        {status ? (
                          <div className="flex items-center gap-1.5">
                            {status.success
                              ? <span style={{ color: "var(--success)" }}><CheckCircle size={14} /></span>
                              : <span style={{ color: "var(--error)" }}><XCircle size={14} /></span>
                            }
                            <span className="text-xs" style={{ color: status.success ? "var(--success)" : "var(--error)" }}>
                              {status.success ? "Connected" : "Failed"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => testConnection(conn.id)}
                            disabled={testingId === conn.id}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs transition-colors disabled:opacity-50"
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
                            <RefreshCw size={11} className={testingId === conn.id ? "animate-spin" : ""} />
                            Test
                          </button>
                          <button
                            onClick={() => confirmDelete(conn.id, conn.name)}
                            disabled={deletingId === conn.id}
                            className="flex items-center gap-1 px-2 py-1 text-xs transition-colors disabled:opacity-50"
                            style={{
                              border: "1px solid var(--bg-border)",
                              color: "var(--text-muted)",
                              borderRadius: "2px",
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(220,38,38,0.3)";
                              (e.currentTarget as HTMLButtonElement).style.color = "var(--error)";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--bg-border)";
                              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
                            }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
