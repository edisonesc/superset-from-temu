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

/** Datasets list page — shows all datasets with type and connection info. */
export default function DatasetsPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["datasets", search],
    queryFn: () => fetchDatasets(search),
  });

  const datasets = data?.data ?? [];

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Datasets</h1>
        <Link
          href="/datasets/new"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          <Plus size={14} />
          New Dataset
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Database
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search datasets…"
          className="w-full max-w-sm bg-zinc-800 text-zinc-200 text-sm rounded pl-8 pr-3 py-2 outline-none placeholder:text-zinc-600"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-red-400 text-sm">Failed to load datasets.</div>
      ) : datasets.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
          <Table className="h-12 w-12 text-zinc-700" />
          <div>
            <p className="text-zinc-400 font-medium">No datasets yet</p>
            <p className="text-zinc-600 text-sm mt-1">
              Create a dataset from a database table to start building charts.
            </p>
          </div>
          <Link
            href="/datasets/new"
            className="px-4 py-2 text-sm rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            New Dataset
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Connection</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Table / SQL</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {datasets.map((ds) => (
                <tr
                  key={ds.id}
                  className="hover:bg-zinc-800/40 transition-colors cursor-pointer"
                  onClick={() => (window.location.href = `/datasets/${ds.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-zinc-200">{ds.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                        ds.sqlDefinition
                          ? "bg-purple-900/40 text-purple-300"
                          : "bg-zinc-700/60 text-zinc-300"
                      }`}
                    >
                      {ds.sqlDefinition ? "Virtual" : "Physical"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{ds.connectionName ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-500 font-mono text-xs">
                    {ds.tableName ?? (ds.sqlDefinition ? "<SQL>" : "—")}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 text-xs">
                    {new Date(ds.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
