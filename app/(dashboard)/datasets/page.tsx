"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Database, Table } from "@/components/ui/icons";

type Dataset = {
  id: string;
  name: string;
  description: string | null;
  connectionName: string | null;
  tableName: string | null;
  sqlDefinition: string | null;
  updatedAt: string;
};

async function fetchDatasets(q: string): Promise<{ data: Dataset[]; total: number }> {
  const res = await fetch(`/api/datasets?q=${encodeURIComponent(q)}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

export default function DatasetsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["datasets", search],
    queryFn: () => fetchDatasets(search),
  });
  const datasets = data?.data ?? [];

  return (
    <div className="flex h-full flex-col" style={{ background: "var(--bg-base)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}
      >
        <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Datasets</h1>
        <Link
          href="/datasets/new"
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white transition-colors"
          style={{ background: "var(--accent)", borderRadius: "2px" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "var(--accent-deep)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "var(--accent)")}
        >
          <Plus size={14} />
          New Dataset
        </Link>
      </div>

      {/* Search */}
      <div
        className="px-6 py-3"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}
      >
        <div className="relative max-w-sm">
          <Database size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search datasets…"
            className="w-full pl-8 pr-3 py-1.5 text-sm outline-none"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--bg-border)",
              color: "var(--text-primary)",
              borderRadius: "2px",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--bg-border)")}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse" style={{ background: "var(--bg-border)", borderRadius: "2px" }} />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm" style={{ color: "var(--error)" }}>Failed to load datasets.</p>
        ) : datasets.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 py-20 text-center">
            <span style={{ color: "var(--text-muted)" }}><Table className="h-12 w-12" /></span>
            <div>
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>No datasets yet</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                Create a dataset from a database table to start building charts.
              </p>
            </div>
            <Link
              href="/datasets/new"
              className="px-4 py-2 text-sm font-medium text-white"
              style={{ background: "var(--accent)", borderRadius: "2px" }}
            >
              New Dataset
            </Link>
          </div>
        ) : (
          <div style={{ border: "1px solid var(--bg-border)", borderRadius: "2px", overflow: "hidden" }}>
            <table className="w-full text-sm">
              <thead style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--bg-border)" }}>
                <tr>
                  {["Name", "Type", "Connection", "Table / SQL", "Updated"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datasets.map((ds, i) => (
                  <tr
                    key={ds.id}
                    className="cursor-pointer transition-colors"
                    style={{ background: i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)", borderBottom: "1px solid var(--bg-border)" }}
                    onClick={() => (window.location.href = `/datasets/${ds.id}`)}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)")}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>{ds.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 text-xs font-medium"
                        style={{
                          borderRadius: "2px",
                          background: ds.sqlDefinition ? "rgba(124,58,237,0.1)" : "var(--bg-elevated)",
                          color: ds.sqlDefinition ? "#7C3AED" : "var(--text-secondary)",
                          border: `1px solid ${ds.sqlDefinition ? "rgba(124,58,237,0.2)" : "var(--bg-border)"}`,
                        }}
                      >
                        {ds.sqlDefinition ? "Virtual" : "Physical"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{ds.connectionName ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                      {ds.tableName ?? (ds.sqlDefinition ? "<SQL>" : "—")}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(ds.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
