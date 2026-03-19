"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader, Save, Database, Table } from "@/components/ui/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type Connection = { id: string; name: string; dialect: string };
type SchemaTable = { name: string; columns: { name: string; type: string }[] };

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json.data as T;
}

const DIALECT_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  mysql:      { bg: "rgba(234,88,12,0.08)",   color: "#EA580C",          border: "rgba(234,88,12,0.2)" },
  postgresql: { bg: "rgba(32,167,201,0.08)",  color: "var(--accent)",    border: "rgba(32,167,201,0.2)" },
};

/** Create dataset form — pick connection, pick table, name it, save. */
export default function NewDatasetPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [connectionId, setConnectionId] = useState("");
  const [datasetType, setDatasetType] = useState<"physical" | "virtual">("physical");
  const [tableName, setTableName] = useState("");
  const [sqlDefinition, setSqlDefinition] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: connections = [] } = useQuery({
    queryKey: ["connections"],
    queryFn: () => fetchJson<Connection[]>("/api/connections"),
  });

  const { data: schemaData, isLoading: schemaLoading } = useQuery({
    queryKey: ["schema", connectionId],
    queryFn: () => fetchJson<SchemaTable[]>(`/api/connections/${connectionId}/schema`),
    enabled: !!connectionId && datasetType === "physical",
  });
  const tables = schemaData ?? [];

  const selectedConnection = connections.find((c) => c.id === connectionId);

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
      await queryClient.invalidateQueries({ queryKey: ["datasets"] });
      router.push("/datasets");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  }

  const inp = {
    background: "var(--bg-elevated)",
    border: "1px solid var(--bg-border)",
    color: "var(--text-primary)",
    borderRadius: "2px",
  };
  const onF = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    (e.currentTarget.style.borderColor = "var(--accent)");
  const onB = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    (e.currentTarget.style.borderColor = "var(--bg-border)");

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-base)" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-6 py-4"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}
      >
        <Link href="/datasets" className="transition-colors" style={{ color: "var(--text-muted)" }}>
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>New Dataset</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Create a dataset from a table or a custom SQL query</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl space-y-5">

          {/* Section: Connection & Type */}
          <div
            className="p-5 space-y-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: "2px" }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Source</h2>

            {/* Connection selector */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Connection <span style={{ color: "var(--error)" }}>*</span>
              </label>
              {connections.length === 0 ? (
                <div
                  className="flex items-center gap-3 px-4 py-3 text-sm"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: "2px" }}
                >
                  <span style={{ color: "var(--text-muted)" }}>No connections found.</span>
                  <Link href="/connections/new" className="font-medium transition-colors" style={{ color: "var(--accent)" }}>
                    Create one first →
                  </Link>
                </div>
              ) : (
                <select
                  value={connectionId}
                  onChange={(e) => { setConnectionId(e.target.value); setTableName(""); setName(""); }}
                  className="w-full text-sm px-3 py-2 outline-none"
                  style={inp}
                  onFocus={onF}
                  onBlur={onB}
                >
                  <option value="">— select connection —</option>
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.dialect})</option>
                  ))}
                </select>
              )}

              {/* Selected connection badge */}
              {selectedConnection && (
                <div className="flex items-center gap-2 mt-2">
                  <span style={{ color: "var(--text-muted)" }}><Database size={12} /></span>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{selectedConnection.name}</span>
                  {DIALECT_COLORS[selectedConnection.dialect] && (
                    <span
                      className="text-[11px] px-1.5 py-0.5 font-medium"
                      style={{
                        background: DIALECT_COLORS[selectedConnection.dialect].bg,
                        color: DIALECT_COLORS[selectedConnection.dialect].color,
                        border: `1px solid ${DIALECT_COLORS[selectedConnection.dialect].border}`,
                        borderRadius: "2px",
                      }}
                    >
                      {selectedConnection.dialect}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Dataset type */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Dataset Type</label>
              <div className="flex gap-3">
                {([
                  { type: "physical", label: "Physical Table", desc: "Map directly to a database table" },
                  { type: "virtual",  label: "Virtual (SQL)",  desc: "Define with a custom SQL query" },
                ] as const).map(({ type, label, desc }) => {
                  const isActive = datasetType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setDatasetType(type)}
                      className="flex-1 text-left px-4 py-3 transition-colors"
                      style={{
                        border: `1px solid ${isActive ? "var(--accent)" : "var(--bg-border)"}`,
                        background: isActive ? "rgba(32,167,201,0.06)" : "var(--bg-elevated)",
                        borderRadius: "2px",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }}>
                          <Table size={13} />
                        </span>
                        <span className="text-xs font-semibold" style={{ color: isActive ? "var(--accent)" : "var(--text-primary)" }}>
                          {label}
                        </span>
                      </div>
                      <p className="text-[11px] pl-5" style={{ color: "var(--text-muted)" }}>{desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section: Table or SQL */}
          {connectionId && (
            <div
              className="p-5 space-y-4"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: "2px" }}
            >
              <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                {datasetType === "physical" ? "Table" : "SQL Definition"}
              </h2>

              {datasetType === "physical" ? (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    Select Table <span style={{ color: "var(--error)" }}>*</span>
                  </label>
                  {schemaLoading ? (
                    <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
                      <Loader size={13} className="animate-spin" />
                      Fetching tables…
                    </div>
                  ) : tables.length === 0 ? (
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>No tables found in this connection.</p>
                  ) : (
                    <>
                      <select
                        value={tableName}
                        onChange={(e) => { setTableName(e.target.value); setName(""); }}
                        className="w-full text-sm px-3 py-2 outline-none"
                        style={inp}
                        onFocus={onF}
                        onBlur={onB}
                      >
                        <option value="">— select table —</option>
                        {tables.map((t) => (
                          <option key={t.name} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                      {tableName && (
                        <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                          {tables.find((t) => t.name === tableName)?.columns.length ?? 0} columns detected
                        </p>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    SQL Query <span style={{ color: "var(--error)" }}>*</span>
                  </label>
                  <textarea
                    value={sqlDefinition}
                    onChange={(e) => setSqlDefinition(e.target.value)}
                    rows={7}
                    placeholder={"SELECT\n  id,\n  name,\n  status\nFROM orders\nWHERE status = 'complete'"}
                    className="w-full text-sm font-mono px-3 py-2.5 outline-none resize-y"
                    style={{
                      ...inp,
                      lineHeight: "1.6",
                      background: "#FAFAFA",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--bg-border)")}
                  />
                </div>
              )}
            </div>
          )}

          {/* Section: Metadata */}
          <div
            className="p-5 space-y-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: "2px" }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Metadata</h2>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Dataset Name <span style={{ color: "var(--error)" }}>*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Orders (Complete)"
                className="w-full text-sm px-3 py-2 outline-none"
                style={inp}
                onFocus={onF}
                onBlur={onB}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description…"
                className="w-full text-sm px-3 py-2 outline-none"
                style={inp}
                onFocus={onF}
                onBlur={onB}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <Link href="/datasets" className="px-4 py-2 text-sm transition-colors" style={{ color: "var(--text-muted)" }}>
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ background: "var(--accent)", borderRadius: "2px" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent-deep)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent)")}
            >
              {isSaving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
              {isSaving ? "Creating…" : "Create Dataset"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
