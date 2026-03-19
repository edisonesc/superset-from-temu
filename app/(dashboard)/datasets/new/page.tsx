"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader, Save } from "@/components/ui/icons";
import { useQuery } from "@tanstack/react-query";

type Connection = { id: string; name: string; dialect: string };
type SchemaTable = { name: string; columns: { name: string; type: string }[] };

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json.data as T;
}

/** Create dataset form — pick connection, pick table, name it, save. */
export default function NewDatasetPage() {
  const router = useRouter();

  const [connectionId, setConnectionId] = useState("");
  const [datasetType, setDatasetType] = useState<"physical" | "virtual">("physical");
  const [tableName, setTableName] = useState("");
  const [sqlDefinition, setSqlDefinition] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load connections
  const { data: connections = [] } = useQuery({
    queryKey: ["connections"],
    queryFn: () => fetchJson<Connection[]>("/api/connections"),
  });

  // Load schema tables when connection is selected
  const { data: schemaData, isLoading: schemaLoading } = useQuery({
    queryKey: ["schema", connectionId],
    queryFn: () =>
      fetchJson<SchemaTable[]>(`/api/connections/${connectionId}/schema`),
    enabled: !!connectionId && datasetType === "physical",
  });
  const tables = schemaData ?? [];

  // Auto-fill dataset name when table is selected
  useEffect(() => {
    if (tableName && !name) {
      setName(tableName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
    }
  }, [tableName, name]);

  async function handleSave() {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!connectionId) { toast.error("Select a connection"); return; }
    if (datasetType === "physical" && !tableName) { toast.error("Select a table"); return; }
    if (datasetType === "virtual" && !sqlDefinition.trim()) { toast.error("Enter SQL definition"); return; }

    setIsSaving(true);
    try {
      const res = await fetch("/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          connectionId,
          tableName: datasetType === "physical" ? tableName : undefined,
          sqlDefinition: datasetType === "virtual" ? sqlDefinition.trim() : undefined,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      toast.success("Dataset created");
      router.push("/datasets");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full p-6 max-w-xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/datasets" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-xl font-bold text-zinc-100">New Dataset</h1>
      </div>

      <div className="space-y-4">
        {/* Connection selector */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Connection <span className="text-red-400">*</span>
          </label>
          {connections.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No connections found.{" "}
              <Link href="/connections/new" className="text-indigo-400 hover:underline">
                Create one first.
              </Link>
            </p>
          ) : (
            <select
              value={connectionId}
              onChange={(e) => {
                setConnectionId(e.target.value);
                setTableName("");
                setName("");
              }}
              className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-3 py-2 outline-none border border-zinc-700 focus:border-indigo-500 transition-colors"
            >
              <option value="">— select connection —</option>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.dialect})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Dataset type */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Dataset Type</label>
          <div className="flex gap-2">
            {(["physical", "virtual"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setDatasetType(type)}
                className={`flex-1 py-2 text-sm rounded border transition-colors capitalize ${
                  datasetType === type
                    ? "border-indigo-500 bg-indigo-600/20 text-indigo-300"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                }`}
              >
                {type} {type === "physical" ? "Table" : "SQL"}
              </button>
            ))}
          </div>
        </div>

        {/* Physical: table selector */}
        {datasetType === "physical" && connectionId && (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Table <span className="text-red-400">*</span>
            </label>
            {schemaLoading ? (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Loader size={13} className="animate-spin" />
                Loading tables…
              </div>
            ) : tables.length === 0 ? (
              <p className="text-sm text-zinc-500">No tables found in this connection.</p>
            ) : (
              <select
                value={tableName}
                onChange={(e) => {
                  setTableName(e.target.value);
                  setName(""); // Let the useEffect auto-fill
                }}
                className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-3 py-2 outline-none border border-zinc-700 focus:border-indigo-500 transition-colors"
              >
                <option value="">— select table —</option>
                {tables.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Virtual: SQL editor */}
        {datasetType === "virtual" && (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              SQL Definition <span className="text-red-400">*</span>
            </label>
            <textarea
              value={sqlDefinition}
              onChange={(e) => setSqlDefinition(e.target.value)}
              rows={6}
              placeholder="SELECT * FROM orders WHERE status = 'complete'"
              className="w-full bg-zinc-800 text-zinc-200 text-sm font-mono rounded px-3 py-2 outline-none placeholder:text-zinc-600 border border-zinc-700 focus:border-indigo-500 transition-colors resize-y"
            />
          </div>
        )}

        {/* Dataset name */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Dataset Name <span className="text-red-400">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Dataset"
            className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-3 py-2 outline-none placeholder:text-zinc-600 border border-zinc-700 focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description…"
            className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-3 py-2 outline-none placeholder:text-zinc-600 border border-zinc-700 focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors"
          >
            {isSaving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? "Saving…" : "Create Dataset"}
          </button>
          <Link href="/datasets" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
