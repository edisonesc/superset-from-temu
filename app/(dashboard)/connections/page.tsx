"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

/** Connections manager page — list, test, and delete connections. Create via /connections/new. */
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
    mutationFn: (id: string) =>
      fetchJson<{ id: string }>(`/api/connections/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["connections"] }),
    onSettled: () => setDeletingId(null),
  });

  async function testConnection(id: string) {
    setTestingId(id);
    try {
      const result = await fetchJson<{ success: boolean; message: string }>(
        `/api/connections/${id}/test`,
        { method: "POST" },
      );
      setTestStatuses((prev) => ({ ...prev, [id]: { id, ...result } }));
    } catch (err) {
      setTestStatuses((prev) => ({
        ...prev,
        [id]: { id, success: false, message: err instanceof Error ? err.message : "Test failed" },
      }));
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
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Connections</h1>
        <Link
          href="/connections/new"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          <Plus size={14} />
          New Connection
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-red-400 text-sm">Failed to load connections.</div>
      ) : connections.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
          <Database className="h-12 w-12 text-zinc-700" />
          <div>
            <p className="text-zinc-400 font-medium">No connections yet</p>
            <p className="text-zinc-600 text-sm mt-1">
              Add a database connection to start querying data.
            </p>
          </div>
          <Link
            href="/connections/new"
            className="px-4 py-2 text-sm rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            New Connection
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Dialect</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Host</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Database</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {connections.map((conn) => {
                const status = testStatuses[conn.id];
                return (
                  <tr key={conn.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-zinc-200">{conn.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                          conn.dialect === "mysql"
                            ? "bg-orange-900/40 text-orange-300"
                            : "bg-blue-900/40 text-blue-300"
                        }`}
                      >
                        {conn.dialect}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 font-mono text-xs">
                      {conn.host}:{conn.port}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{conn.databaseName}</td>
                    <td className="px-4 py-3">
                      {status ? (
                        <div className="flex items-center gap-1.5">
                          {status.success ? (
                            <CheckCircle size={14} className="text-emerald-400" />
                          ) : (
                            <XCircle size={14} className="text-red-400" />
                          )}
                          <span
                            className={`text-xs ${status.success ? "text-emerald-400" : "text-red-400"}`}
                          >
                            {status.success ? "Connected" : "Failed"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => testConnection(conn.id)}
                          disabled={testingId === conn.id}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 disabled:opacity-50 transition-colors"
                        >
                          <RefreshCw
                            size={11}
                            className={testingId === conn.id ? "animate-spin" : ""}
                          />
                          Test
                        </button>
                        <button
                          onClick={() => confirmDelete(conn.id, conn.name)}
                          disabled={deletingId === conn.id}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-zinc-800 text-zinc-600 hover:text-red-400 hover:border-red-900 disabled:opacity-50 transition-colors"
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
  );
}
